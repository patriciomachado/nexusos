import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext, uuid } from '@/lib/parts/server'
import { moveStock } from '@/lib/parts/stock'

/** Defective parts, with totals by quality so the store sees which ones fail. */
export async function GET() {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { data, error } = await db.from('part_defects')
        .select('id, quantity, reason, resolution, cost, created_at, resolved_at, supplier_id, service_order_id, suppliers(name), inventory_items(name, device_model, part_quality), service_orders(order_number)')
        .eq('company_id', companyId).order('created_at', { ascending: false }).limit(300)
    if (error) return bad(error.message, 500)
    const byQuality = new Map<string, { quantity: number; loss: number }>()
    for (const d of data ?? []) {
        const inv = (Array.isArray(d.inventory_items) ? d.inventory_items[0] : d.inventory_items) as { part_quality?: string | null } | null
        const k = inv?.part_quality || 'sem qualidade'
        const x = byQuality.get(k) ?? { quantity: 0, loss: 0 }
        x.quantity += Number(d.quantity) || 0
        if (d.resolution === 'prejuizo') x.loss += Number(d.cost) || 0
        byQuality.set(k, x)
    }
    return NextResponse.json({ defects: data ?? [], by_quality: [...byQuality.entries()].map(([quality, v]) => ({ quality, ...v })).sort((a, b) => b.quantity - a.quantity) })
}

const schema = z.object({
    inventory_item_id: uuid,
    supplier_id: uuid.optional().nullable(),
    service_order_id: uuid.optional().nullable(),
    quantity: z.coerce.number().positive().max(10000).default(1),
    reason: z.string().trim().max(500).optional().nullable(),
    // The defective part is still on the shelf: take it out of stock.
    take_from_stock: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId, dbUser } = g.ctx
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const d = parsed.data
    const { data: part } = await db.from('inventory_items').select('id, cost_price, supplier_id').eq('id', d.inventory_item_id).eq('company_id', companyId).maybeSingle()
    if (!part) return bad('Peça não encontrada', 404)
    const supplierId = d.supplier_id ?? part.supplier_id ?? null
    if (supplierId) {
        const { data: s } = await db.from('suppliers').select('id').eq('id', supplierId).eq('company_id', companyId).maybeSingle()
        if (!s) return bad('Fornecedor não encontrado')
    }
    if (d.service_order_id) {
        const { data: os } = await db.from('service_orders').select('id').eq('id', d.service_order_id).eq('company_id', companyId).maybeSingle()
        if (!os) return bad('OS não encontrada')
    }
    const { data, error } = await db.from('part_defects').insert({
        company_id: companyId, inventory_item_id: d.inventory_item_id, supplier_id: supplierId, service_order_id: d.service_order_id ?? null,
        quantity: d.quantity, reason: d.reason || null, cost: Math.round(Number(part.cost_price || 0) * d.quantity * 100) / 100, created_by: dbUser.id,
    }).select('id').single()
    if (error || !data) return bad(error?.message ?? 'Não foi possível registrar', 500)
    if (d.take_from_stock) await moveStock(db, companyId, { itemId: d.inventory_item_id, quantity: -d.quantity, reason: 'defeito', refId: data.id, userId: dbUser.id, notes: d.reason || 'Peça com defeito' })
    return NextResponse.json({ id: data.id }, { status: 201 })
}
