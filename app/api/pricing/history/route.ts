import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'

/** What the store already charged for items named like `q` in past OS. */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role) && !isOwner(ctx.role)) return forbiddenResponse()

    const q = (req.nextUrl.searchParams.get('q') ?? '').trim().replace(/[%_,()]/g, ' ').slice(0, 80)
    if (q.length < 3) return NextResponse.json({ count: 0 })

    const { data } = await ctx.db
        .from('service_order_items')
        .select('unit_price, created_at, service_orders!inner(company_id)')
        .eq('service_orders.company_id', ctx.companyId)
        .ilike('item_name', `%${q}%`)
        .gt('unit_price', 0)
        .order('created_at', { ascending: false })
        .limit(200)

    const prices = (data ?? []).map(r => Number(r.unit_price) || 0).filter(p => p > 0)
    if (!prices.length) return NextResponse.json({ count: 0 })
    return NextResponse.json({
        count: prices.length,
        average: prices.reduce((s, p) => s + p, 0) / prices.length,
        min: Math.min(...prices),
        max: Math.max(...prices),
        last: prices[0],
    })
}
