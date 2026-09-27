import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext, uuid } from '@/lib/parts/server'

const ORDER_FIELDS = 'id, status, notes, total, created_at, sent_at, received_at, supplier_id, suppliers(name, phone), part_order_items(id, inventory_item_id, quantity, unit_cost, service_order_id, inventory_items(name, device_model))'

/** Purchase orders, newest first (open and sent ones on top in the screen). */
export async function GET() {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { data, error } = await db.from('part_orders').select(ORDER_FIELDS).eq('company_id', companyId).order('created_at', { ascending: false }).limit(60)
    if (error) return bad(error.message, 500)
    return NextResponse.json({ orders: data ?? [] })
}

const schema = z.object({
    supplier_id: uuid.optional().nullable(),
    status: z.enum(['aberto', 'enviado']).default('aberto'),
    notes: z.string().trim().max(500).optional().nullable(),
    items: z.array(z.object({
        inventory_item_id: uuid,
        quantity: z.coerce.number().positive('Quantidade inválida').max(100000),
        unit_cost: z.coerce.number().min(0).max(1_000_000).default(0),
        service_order_id: uuid.optional().nullable(),
    })).min(1, 'Escolha ao menos uma peça').max(200),
})

export async function POST(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId, dbUser } = g.ctx
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const { supplier_id, status, notes, items } = parsed.data

    if (supplier_id) {
        const { data: s } = await db.from('suppliers').select('id').eq('id', supplier_id).eq('company_id', companyId).maybeSingle()
        if (!s) return bad('Fornecedor não encontrado')
    }
    const ids = [...new Set(items.map(i => i.inventory_item_id))]
    const { data: owned } = await db.from('inventory_items').select('id').eq('company_id', companyId).in('id', ids)
    if ((owned ?? []).length !== ids.length) return bad('Peça não encontrada')

    const total = Math.round(items.reduce((a, i) => a + i.quantity * i.unit_cost, 0) * 100) / 100
    const { data: order, error } = await db.from('part_orders').insert({
        company_id: companyId, supplier_id: supplier_id ?? null, status, notes: notes || null, total,
        created_by: dbUser.id, sent_at: status === 'enviado' ? new Date().toISOString() : null,
    }).select('id').single()
    if (error || !order) return bad(error?.message ?? 'Não foi possível criar o pedido', 500)

    const { error: itemsError } = await db.from('part_order_items').insert(items.map(i => ({ ...i, service_order_id: i.service_order_id ?? null, order_id: order.id, company_id: companyId })))
    if (itemsError) {
        await db.from('part_orders').delete().eq('id', order.id)
        return bad(itemsError.message, 500)
    }
    return NextResponse.json({ id: order.id }, { status: 201 })
}
