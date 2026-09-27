import { NextRequest, NextResponse } from 'next/server'
import { bad, firstIssue, partsContext, supplierSchema } from '@/lib/parts/server'

/**
 * Suppliers with what the store bought from each (received orders) and how
 * many of those parts came back defective, so the defect rate compares them.
 */
export async function GET() {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const [{ data: suppliers }, { data: orders }, { data: defects }] = await Promise.all([
        db.from('suppliers').select('id, name, phone, notes, site_url, created_at').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('part_orders').select('supplier_id, total, part_order_items(quantity)').eq('company_id', companyId).eq('status', 'recebido').limit(5000),
        db.from('part_defects').select('supplier_id, quantity, resolution, cost').eq('company_id', companyId).limit(5000),
    ])
    const stats = new Map<string, { bought: number; spent: number; orders: number; defects: number; loss: number }>()
    const s = (id: string) => { let x = stats.get(id); if (!x) { x = { bought: 0, spent: 0, orders: 0, defects: 0, loss: 0 }; stats.set(id, x) } return x }
    for (const o of orders ?? []) {
        if (!o.supplier_id) continue
        const x = s(o.supplier_id)
        x.orders++
        x.spent += Number(o.total) || 0
        x.bought += ((o.part_order_items ?? []) as { quantity: number }[]).reduce((a, i) => a + Number(i.quantity), 0)
    }
    for (const d of defects ?? []) {
        if (!d.supplier_id) continue
        const x = s(d.supplier_id)
        x.defects += Number(d.quantity) || 0
        if (d.resolution === 'prejuizo') x.loss += Number(d.cost) || 0
    }
    return NextResponse.json({
        suppliers: (suppliers ?? []).map(sp => {
            const x = stats.get(sp.id) ?? { bought: 0, spent: 0, orders: 0, defects: 0, loss: 0 }
            return { ...sp, ...x, defect_rate: x.bought > 0 ? Math.round((x.defects / x.bought) * 1000) / 10 : null }
        }),
    })
}

export async function POST(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const parsed = supplierSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const { data, error } = await db.from('suppliers').insert({ ...parsed.data, company_id: companyId }).select('id, name, phone, notes, site_url').single()
    if (error) return bad(error.message, 500)
    return NextResponse.json({ supplier: data }, { status: 201 })
}
