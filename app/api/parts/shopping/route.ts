import { NextResponse } from 'next/server'
import { partsContext } from '@/lib/parts/server'

type Part = { id: string; name: string; device_model: string | null; part_quality: string | null; quantity_in_stock: number; minimum_quantity: number; cost_price: number; supplier_id: string | null }

/**
 * What to buy: parts at or below the minimum (or negative because an OS used
 * one that wasn't in stock) and parts that orders "Aguardando peças" need,
 * minus what is already on an open order. Grouped by supplier: the part's own
 * supplier, else whoever quoted it cheapest last.
 */
export async function GET() {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx

    const [{ data: parts }, { data: waiting }, { data: pending }, { data: quotes }, { data: suppliers }] = await Promise.all([
        db.from('inventory_items').select('id, name, device_model, part_quality, quantity_in_stock, minimum_quantity, cost_price, supplier_id').eq('company_id', companyId).eq('kind', 'peca').eq('is_active', true).limit(3000),
        db.from('service_orders').select('id, order_number, title, stock_tracked, service_order_items(inventory_item_id, quantity)').eq('company_id', companyId).eq('status', 'aguardando_pecas').limit(500),
        db.from('part_orders').select('part_order_items(inventory_item_id, quantity)').eq('company_id', companyId).in('status', ['aberto', 'enviado']).limit(500),
        db.from('supplier_prices').select('inventory_item_id, supplier_id, price, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5000),
        db.from('suppliers').select('id, name, phone').eq('company_id', companyId).eq('is_active', true),
    ])

    const onOrder = new Map<string, number>()
    for (const o of pending ?? []) for (const it of (o.part_order_items ?? []) as { inventory_item_id: string; quantity: number }[]) {
        onOrder.set(it.inventory_item_id, (onOrder.get(it.inventory_item_id) ?? 0) + Number(it.quantity))
    }
    // Orders waiting for a part. Older orders never took their parts out of
    // stock, so what they need is added on top.
    const waitingFor = new Map<string, { os: { id: string; order_number: string; title: string }[]; untracked: number }>()
    for (const os of waiting ?? []) for (const it of (os.service_order_items ?? []) as { inventory_item_id: string | null; quantity: number }[]) {
        if (!it.inventory_item_id) continue
        const w = waitingFor.get(it.inventory_item_id) ?? { os: [], untracked: 0 }
        if (!w.os.some(o => o.id === os.id)) w.os.push({ id: os.id, order_number: os.order_number, title: os.title })
        if (!os.stock_tracked) w.untracked += Number(it.quantity) || 0
        waitingFor.set(it.inventory_item_id, w)
    }
    // Latest price per part per supplier.
    const latest = new Map<string, Map<string, number>>()
    for (const q of quotes ?? []) {
        const m = latest.get(q.inventory_item_id) ?? new Map<string, number>()
        if (!m.has(q.supplier_id)) m.set(q.supplier_id, Number(q.price))
        latest.set(q.inventory_item_id, m)
    }
    const supplierById = new Map((suppliers ?? []).map(s => [s.id, s]))

    type Group = { supplier: { id: string; name: string; phone: string | null } | null; items: Record<string, unknown>[]; total: number }
    const groups = new Map<string, Group>()
    for (const p of (parts ?? []) as Part[]) {
        const stock = Number(p.quantity_in_stock) || 0
        const min = Number(p.minimum_quantity) || 0
        const w = waitingFor.get(p.id)
        const available = stock - (w?.untracked ?? 0) + (onOrder.get(p.id) ?? 0)
        // Short when it went negative (used before it arrived) or hit the minimum.
        if (!(available < 0 || (min > 0 && available <= min))) continue
        const need = Math.max(Math.ceil(min * 2 - available), 1)

        const prices = latest.get(p.id)
        let supplierId = p.supplier_id && supplierById.has(p.supplier_id) ? p.supplier_id : null
        if (!supplierId && prices?.size) supplierId = [...prices.entries()].filter(([sid]) => supplierById.has(sid)).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null
        const quoted = supplierId ? prices?.get(supplierId) : undefined
        const unitCost = quoted ?? (Number(p.cost_price) || 0)
        const key = supplierId ?? 'none'
        const grp: Group = groups.get(key) ?? { supplier: supplierId ? supplierById.get(supplierId)! : null, items: [], total: 0 }
        grp.items.push({
            part_id: p.id, name: p.name, device_model: p.device_model, part_quality: p.part_quality,
            stock, minimum: min, on_order: onOrder.get(p.id) ?? 0, need, unit_cost: unitCost,
            waiting_os: w?.os ?? [],
        })
        grp.total += need * unitCost
        groups.set(key, grp)
    }

    return NextResponse.json({
        groups: [...groups.values()].sort((a, b) => (a.supplier ? 0 : 1) - (b.supplier ? 0 : 1) || b.items.length - a.items.length),
    })
}
