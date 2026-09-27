import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { InventoryOption, PriceOption } from '@/components/os/form/state'
import { loadRepairPrices } from '@/lib/parts/prices'

/**
 * What the OS form can add as lines: stock items (parts first) and the repair
 * price table. Works before the parts migration too, with plain stock items.
 */
export async function loadItemOptions(db: SupabaseClient, companyId: string): Promise<{ inventory: InventoryOption[]; prices: PriceOption[] }> {
    const base = () => db.from('inventory_items').select('id, name, selling_price, cost_price, category').eq('company_id', companyId).eq('is_active', true).order('name')
    const [rich, table] = await Promise.all([
        db.from('inventory_items').select('id, name, selling_price, cost_price, category, kind, device_model, quantity_in_stock').eq('company_id', companyId).eq('is_active', true).order('name'),
        loadRepairPrices(db, companyId),
    ])
    const inventory = (rich.error ? (await base()).data : rich.data) ?? []
    return {
        inventory: [...inventory].sort((a, b) => Number((b as { kind?: string }).kind === 'peca') - Number((a as { kind?: string }).kind === 'peca')) as InventoryOption[],
        prices: table.prices.map(p => ({
            id: p.id, device_model: p.device_model, service: p.service, part_item_id: p.part_item_id, price: p.price,
            part_cost: p.part?.cost_price ?? 0, part_name: p.part?.name ?? null, part_stock: p.part ? p.part.quantity_in_stock : null,
        })),
    }
}
