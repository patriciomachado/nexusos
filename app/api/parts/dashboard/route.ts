import { NextResponse } from 'next/server'
import { partsContext } from '@/lib/parts/server'

const DAY = 86_400_000

/**
 * Parts overview: money sitting in stock, what leaves the most, what hasn't
 * moved in 90 days, profit per part on service orders, and pending work
 * (open orders, unresolved defects).
 */
export async function GET() {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const now = Date.now()
    const since30 = new Date(now - 30 * DAY).toISOString()
    const since90 = new Date(now - 90 * DAY).toISOString()

    const [{ data: parts }, { data: moves }, { data: orders }, { count: pendingDefects }] = await Promise.all([
        db.from('inventory_items').select('id, name, device_model, quantity_in_stock, minimum_quantity, cost_price, created_at').eq('company_id', companyId).eq('kind', 'peca').eq('is_active', true).limit(3000),
        db.from('stock_movements').select('inventory_item_id, quantity, reason, created_at').eq('company_id', companyId).in('reason', ['os', 'venda', 'devolucao']).gte('created_at', since90).limit(20000),
        db.from('part_orders').select('status, total').eq('company_id', companyId).in('status', ['aberto', 'enviado']),
        db.from('part_defects').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('resolution', 'pendente'),
    ])
    const list = parts ?? []
    const ids = new Set(list.map(p => p.id))

    // Units out (net of OS give-backs) in 30 and 90 days, and last time each part left.
    const out30 = new Map<string, number>(), out90 = new Map<string, number>(), lastOut = new Map<string, number>()
    for (const m of moves ?? []) {
        if (!ids.has(m.inventory_item_id)) continue
        const q = -Number(m.quantity)
        out90.set(m.inventory_item_id, (out90.get(m.inventory_item_id) ?? 0) + q)
        if (m.created_at >= since30) out30.set(m.inventory_item_id, (out30.get(m.inventory_item_id) ?? 0) + q)
        if (q > 0) lastOut.set(m.inventory_item_id, Math.max(lastOut.get(m.inventory_item_id) ?? 0, new Date(m.created_at).getTime()))
    }

    // Profit per part on orders of the last 30 days.
    // Older databases have no unit_cost on order lines: use the part's current cost then.
    const osQuery = (cols: string) => db.from('service_orders').select(`status, service_order_items(${cols})`).eq('company_id', companyId).gte('created_at', since30).neq('status', 'cancelada').limit(3000)
    const withCost = await osQuery('inventory_item_id, quantity, unit_price, unit_cost')
    const osRows = withCost.error ? (await osQuery('inventory_item_id, quantity, unit_price')).data : withCost.data
    const costOf = new Map(list.map(p => [p.id, Number(p.cost_price) || 0]))
    const profit = new Map<string, { revenue: number; cost: number; qty: number }>()
    for (const os of (osRows ?? []) as { service_order_items?: unknown }[]) for (const it of (os.service_order_items ?? []) as { inventory_item_id: string | null; quantity: number; unit_price: number; unit_cost?: number | null }[]) {
        if (!it.inventory_item_id || !ids.has(it.inventory_item_id)) continue
        const x = profit.get(it.inventory_item_id) ?? { revenue: 0, cost: 0, qty: 0 }
        x.qty += Number(it.quantity) || 0
        x.revenue += (Number(it.unit_price) || 0) * (Number(it.quantity) || 0)
        x.cost += (it.unit_cost != null ? Number(it.unit_cost) || 0 : costOf.get(it.inventory_item_id) ?? 0) * (Number(it.quantity) || 0)
        profit.set(it.inventory_item_id, x)
    }

    const invested = list.reduce((a, p) => a + Math.max(Number(p.quantity_in_stock), 0) * (Number(p.cost_price) || 0), 0)
    const low = list.filter(p => Number(p.quantity_in_stock) < 0 || (Number(p.minimum_quantity) > 0 && Number(p.quantity_in_stock) <= Number(p.minimum_quantity))).length
    const name = (p: { name: string; device_model: string | null }) => p.device_model && !p.name.toLowerCase().includes(p.device_model.toLowerCase()) ? `${p.name} · ${p.device_model}` : p.name

    const top = list
        .map(p => ({ id: p.id, name: name(p), out: out30.get(p.id) ?? 0, stock: Number(p.quantity_in_stock) }))
        .filter(p => p.out > 0).sort((a, b) => b.out - a.out).slice(0, 8)
    const stale = list
        .filter(p => Number(p.quantity_in_stock) > 0 && new Date(p.created_at).getTime() < now - 90 * DAY && (lastOut.get(p.id) ?? 0) < now - 90 * DAY)
        .map(p => ({ id: p.id, name: name(p), stock: Number(p.quantity_in_stock), value: Number(p.quantity_in_stock) * (Number(p.cost_price) || 0) }))
        .sort((a, b) => b.value - a.value).slice(0, 8)
    const profitable = list
        .map(p => { const x = profit.get(p.id); return x ? { id: p.id, name: name(p), qty: x.qty, revenue: x.revenue, profit: x.revenue - x.cost, margin: x.revenue > 0 ? Math.round(((x.revenue - x.cost) / x.revenue) * 100) : null } : null })
        .filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.profit - a.profit).slice(0, 8)
    // Turnover: units out in 90 days per unit on the shelf.
    const totalOut90 = [...out90.values()].reduce((a, b) => a + Math.max(b, 0), 0)
    const totalStock = list.reduce((a, p) => a + Math.max(Number(p.quantity_in_stock), 0), 0)

    return NextResponse.json({
        parts: list.length,
        invested: Math.round(invested * 100) / 100,
        stale_value: Math.round(stale.reduce((a, s) => a + s.value, 0) * 100) / 100,
        low,
        turnover_90: totalStock > 0 ? Math.round((totalOut90 / totalStock) * 10) / 10 : null,
        open_orders: (orders ?? []).length,
        open_orders_total: Math.round((orders ?? []).reduce((a, o) => a + (Number(o.total) || 0), 0) * 100) / 100,
        pending_defects: pendingDefects ?? 0,
        top, stale, profitable,
    })
}
