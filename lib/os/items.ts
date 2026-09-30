import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>

/**
 * Inserts order lines. Databases created before the cost columns existed
 * reject unit_cost/total_cost; then the lines are saved without them rather
 * than being lost.
 */
export async function insertOrderItems(db: SupabaseClient, rows: Row[]) {
    if (!rows.length) return null
    const { error } = await db.from('service_order_items').insert(rows)
    if (!error) return null
    if (error.code === 'PGRST204' || /unit_cost|total_cost/.test(error.message ?? '')) {
        const plain = rows.map(r => {
            const copy = { ...r }
            delete copy.unit_cost
            delete copy.total_cost
            return copy
        })
        const retry = await db.from('service_order_items').insert(plain)
        if (!retry.error) return null
        console.error('[service-orders] items insert failed:', retry.error)
        return retry.error
    }
    console.error('[service-orders] items insert failed:', error)
    return error
}
