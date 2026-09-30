import { NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

/** The store's best sellers of the last 90 days, for one-tap buttons in the PDV. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString()
    const { data: sales } = await ctx.db.from('sales').select('id').eq('company_id', ctx.companyId).gte('created_at', since).neq('status', 'cancelled').limit(3000)
    const ids = (sales ?? []).map(s => s.id)
    const qty = new Map<string, number>()
    for (let i = 0; i < ids.length; i += 300) {
        const { data } = await ctx.db.from('sale_items').select('inventory_item_id, quantity').in('sale_id', ids.slice(i, i + 300))
        for (const r of data ?? []) if (r.inventory_item_id) qty.set(r.inventory_item_id, (qty.get(r.inventory_item_id) ?? 0) + Number(r.quantity || 0))
    }
    const top = [...qty].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id)
    if (!top.length) return NextResponse.json({ data: [] })
    const { data: items } = await ctx.db.from('inventory_items').select('*').eq('company_id', ctx.companyId).eq('is_active', true).in('id', top)
    const order = new Map(top.map((id, i) => [id, i]))
    return NextResponse.json({ data: (items ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) })
}
