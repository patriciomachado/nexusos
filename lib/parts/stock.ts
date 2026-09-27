import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MovementReason = 'os' | 'compra' | 'ajuste' | 'defeito' | 'venda' | 'devolucao' | 'inicial'

/**
 * Moves stock and records why. quantity > 0 enters, < 0 leaves. Stock may go
 * negative (a part used before its purchase was registered) so nothing is
 * silently lost; the screens show it in red.
 */
export async function moveStock(db: SupabaseClient, companyId: string, m: {
    itemId: string
    quantity: number
    reason: MovementReason
    sourceType?: string
    sourceId?: string | null
    unitCost?: number | null
    notes?: string | null
    userId?: string | null
}) {
    if (!m.quantity) return null
    const { data: item } = await db.from('inventory_items').select('quantity_in_stock').eq('id', m.itemId).eq('company_id', companyId).maybeSingle()
    if (!item) return 'Item não encontrado'
    const next = Math.round((Number(item.quantity_in_stock) + m.quantity) * 1000) / 1000
    const { error } = await db.from('inventory_items').update({ quantity_in_stock: next }).eq('id', m.itemId).eq('company_id', companyId)
    if (error) return error.message
    await db.from('stock_movements').insert({
        company_id: companyId,
        inventory_item_id: m.itemId,
        quantity: m.quantity,
        reason: m.reason,
        source_type: m.sourceType ?? null,
        source_id: m.sourceId ?? null,
        unit_cost: m.unitCost ?? null,
        notes: m.notes ?? null,
        user_id: m.userId ?? null,
    })
    return null
}

/**
 * Makes the stock match the parts on a service order. Compares what the OS
 * uses now with what was already taken out for it and moves only the
 * difference, so it can run after every save, status change or delete.
 * Cancelled or deleted orders give everything back. Orders created before
 * stock tracking existed are left alone.
 */
export async function syncServiceOrderStock(db: SupabaseClient, companyId: string, osId: string, opts: { deleted?: boolean; userId?: string | null } = {}) {
    const { data: os, error } = await db.from('service_orders').select('status, stock_tracked, order_number').eq('id', osId).eq('company_id', companyId).maybeSingle()
    if (error || !os || !os.stock_tracked) return

    const wanted = new Map<string, number>()
    if (!opts.deleted && os.status !== 'cancelada') {
        const { data: items } = await db.from('service_order_items').select('inventory_item_id, quantity').eq('service_order_id', osId)
        for (const it of items ?? []) {
            if (!it.inventory_item_id) continue
            wanted.set(it.inventory_item_id, (wanted.get(it.inventory_item_id) ?? 0) + Number(it.quantity || 0))
        }
    }

    const { data: moves } = await db.from('stock_movements').select('inventory_item_id, quantity').eq('company_id', companyId).eq('source_type', 'service_order').eq('source_id', osId)
    const taken = new Map<string, number>()
    for (const mv of moves ?? []) taken.set(mv.inventory_item_id, (taken.get(mv.inventory_item_id) ?? 0) - Number(mv.quantity))

    for (const id of new Set([...wanted.keys(), ...taken.keys()])) {
        const diff = (wanted.get(id) ?? 0) - (taken.get(id) ?? 0)
        if (Math.abs(diff) < 0.0005) continue
        await moveStock(db, companyId, {
            itemId: id,
            quantity: -diff,
            reason: diff > 0 ? 'os' : 'devolucao',
            sourceType: 'service_order',
            sourceId: osId,
            notes: `OS ${os.order_number ?? ''}`.trim(),
            userId: opts.userId,
        })
    }
}
