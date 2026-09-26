import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MovementKind = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'devolucao' | 'os'

/**
 * Writes one line of a product's stock history. Best effort: stock itself is
 * already updated by the caller, and a store that hasn't run the
 * 20261002_produtos_agenda.sql update simply has no history.
 */
export async function logMovement(db: SupabaseClient, m: {
    companyId: string
    itemId: string
    quantity: number
    balance?: number | null
    kind: MovementKind
    reason?: string | null
    unitCost?: number | null
    refId?: string | null
    userId?: string | null
}) {
    if (!m.quantity) return
    const { error } = await db.from('inventory_movements').insert({
        company_id: m.companyId,
        item_id: m.itemId,
        quantity: m.quantity,
        balance: m.balance ?? null,
        kind: m.kind,
        reason: m.reason?.slice(0, 200) || null,
        unit_cost: m.unitCost ?? null,
        ref_id: m.refId ?? null,
        created_by: m.userId ?? null,
    })
    if (error && error.code !== '42P01') console.error('[inventory] movement not saved:', error.message)
}
