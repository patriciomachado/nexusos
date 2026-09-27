import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_LABOR_MIN, DEFAULT_PART_MARGIN, suggestedPrice } from './server'

export interface RepairPrice {
    id: string
    device_model: string
    service: string
    part_item_id: string | null
    labor_price: number
    price: number
    notes: string | null
    part: { name: string; cost_price: number; quantity_in_stock: number } | null
    suggested: number
}

export async function loadPartMargin(db: SupabaseClient, companyId: string) {
    const { data } = await db.from('companies').select('settings').eq('id', companyId).single()
    const parts = ((data?.settings ?? {}) as { parts?: { margin_pct?: number; labor_min?: number } }).parts
    const margin = Number(parts?.margin_pct)
    const laborMin = Number(parts?.labor_min)
    return {
        margin: Number.isFinite(margin) && margin >= 0 ? margin : DEFAULT_PART_MARGIN,
        laborMin: Number.isFinite(laborMin) && laborMin >= 0 ? laborMin : DEFAULT_LABOR_MIN,
    }
}

/** The price table with each part's current cost and the suggested price. */
export async function loadRepairPrices(db: SupabaseClient, companyId: string): Promise<{ prices: RepairPrice[]; margin: number; laborMin: number }> {
    const [{ data, error }, { margin, laborMin }] = await Promise.all([
        db.from('repair_prices').select('id, device_model, service, part_item_id, labor_price, price, notes, inventory_items(name, cost_price, quantity_in_stock)').eq('company_id', companyId).order('device_model').order('service').limit(3000),
        loadPartMargin(db, companyId),
    ])
    if (error) return { prices: [], margin, laborMin }
    return {
        margin,
        laborMin,
        prices: (data ?? []).map(r => {
            const part = (Array.isArray(r.inventory_items) ? r.inventory_items[0] : r.inventory_items) as RepairPrice['part']
            return {
                id: r.id, device_model: r.device_model, service: r.service, part_item_id: r.part_item_id,
                labor_price: Number(r.labor_price) || 0, price: Number(r.price) || 0, notes: r.notes,
                part: part ? { name: part.name, cost_price: Number(part.cost_price) || 0, quantity_in_stock: Number(part.quantity_in_stock) || 0 } : null,
                suggested: suggestedPrice(Number(part?.cost_price) || 0, Number(r.labor_price) || 0, margin, laborMin),
            }
        }),
    }
}
