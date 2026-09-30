import { NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

/**
 * Every active customer with the numbers the list needs for segments:
 * total spent, last visit, what they owe, number of OS and purchases.
 */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId } = ctx
    const [cust, pays, oss, sales] = await Promise.all([
        db.from('customers').select('*').eq('company_id', companyId).eq('is_active', true).order('name').limit(5000),
        db.from('payments').select('customer_id, amount, payment_status, payment_date').eq('company_id', companyId).not('customer_id', 'is', null).limit(50000),
        db.from('service_orders').select('customer_id, created_at').eq('company_id', companyId).not('customer_id', 'is', null).limit(50000),
        db.from('sales').select('customer_id, created_at').eq('company_id', companyId).not('customer_id', 'is', null).limit(50000),
    ])
    if (cust.error) return NextResponse.json({ error: cust.error.message }, { status: 500 })
    type Agg = { spent: number; debt: number; last: string | null; os: number; buys: number }
    const agg = new Map<string, Agg>()
    const get = (id: string) => { let a = agg.get(id); if (!a) { a = { spent: 0, debt: 0, last: null, os: 0, buys: 0 }; agg.set(id, a) } return a }
    const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)
    for (const p of pays.data ?? []) {
        const a = get(p.customer_id)
        if (p.payment_status === 'completed') { a.spent += Number(p.amount) || 0; a.last = later(a.last, p.payment_date) }
        else if (p.payment_status === 'pending') a.debt += Number(p.amount) || 0
    }
    for (const o of oss.data ?? []) { const a = get(o.customer_id); a.os++; a.last = later(a.last, o.created_at) }
    for (const s of sales.data ?? []) { const a = get(s.customer_id); a.buys++; a.last = later(a.last, s.created_at) }
    const data = (cust.data ?? []).map(c => {
        const a = agg.get(c.id) ?? { spent: 0, debt: 0, last: null, os: 0, buys: 0 }
        return { ...c, spent: Math.round(a.spent * 100) / 100, debt: Math.round(a.debt * 100) / 100, last_visit: a.last, os_count: a.os, purchases: a.buys }
    })
    return NextResponse.json({ data })
}
