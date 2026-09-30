import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logMovement, type MovementKind } from '@/lib/inventory/movements'

/**
 * Moves stock and records why, using the same inventory_movements ledger as
 * Produtos (lib/inventory/movements.ts). quantity > 0 enters, < 0 leaves.
 * Stock may go negative (a part used before its purchase was registered) so
 * nothing is silently lost; the screens show it in red.
 */
export async function moveStock(db: SupabaseClient, companyId: string, m: {
    itemId: string
    quantity: number
    reason: MovementKind
    /** Ties the movement to what caused it (an OS, a purchase, a defect), stored as ref_id. */
    refId?: string | null
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
    await logMovement(db, {
        companyId, itemId: m.itemId, quantity: m.quantity, balance: next, kind: m.reason,
        reason: m.notes ?? null, unitCost: m.unitCost ?? null, refId: m.refId ?? null, userId: m.userId ?? null,
    })
    return null
}

/**
 * Makes the stock match the parts on a service order. Compares what the OS
 * uses now with what was already taken out for it (kind 'os', ref_id = OS id)
 * and moves only the difference, so it can run after every save, status
 * change or delete. Cancelled or deleted orders give everything back. Orders
 * created before stock tracking existed are left alone.
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

    // Both takes (kind 'os') and give-backs (kind 'devolucao') for this order
    // share ref_id = osId, so netting every movement tied to it gives what's
    // still out, regardless of how many times this has run before.
    const { data: moves } = await db.from('inventory_movements').select('item_id, quantity').eq('company_id', companyId).eq('ref_id', osId)
    const taken = new Map<string, number>()
    for (const mv of moves ?? []) taken.set(mv.item_id, (taken.get(mv.item_id) ?? 0) - Number(mv.quantity))

    for (const id of new Set([...wanted.keys(), ...taken.keys()])) {
        const diff = (wanted.get(id) ?? 0) - (taken.get(id) ?? 0)
        if (Math.abs(diff) < 0.0005) continue
        await moveStock(db, companyId, {
            itemId: id,
            quantity: -diff,
            reason: diff > 0 ? 'os' : 'devolucao',
            refId: osId,
            notes: `OS ${os.order_number ?? ''}`.trim(),
            userId: opts.userId,
        })
    }
}
