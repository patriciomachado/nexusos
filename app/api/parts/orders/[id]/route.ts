import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext, uuid } from '@/lib/parts/server'
import { moveStock } from '@/lib/parts/stock'

type P = { params: Promise<{ id: string }> }

const schema = z.object({
    action: z.enum(['enviar', 'receber', 'cancelar']),
    // What actually arrived, per order line (defaults to what was ordered).
    items: z.array(z.object({
        id: uuid,
        quantity: z.coerce.number().min(0).max(100000),
        unit_cost: z.coerce.number().min(0).max(1_000_000),
    })).optional(),
})

/**
 * Order lifecycle. Receiving puts the parts in stock, updates each part's
 * cost and the supplier's price history, and returns the service orders
 * "Aguardando peças" that can now continue.
 */
export async function PATCH(req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId, dbUser } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))

    const { data: order } = await db.from('part_orders').select('id, status, supplier_id, part_order_items(id, inventory_item_id, quantity, unit_cost)').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!order) return bad('Pedido não encontrado', 404)
    if (order.status === 'recebido' || order.status === 'cancelado') return bad('Este pedido já foi finalizado')

    if (parsed.data.action === 'enviar') {
        await db.from('part_orders').update({ status: 'enviado', sent_at: new Date().toISOString() }).eq('id', id).eq('company_id', companyId)
        return NextResponse.json({ success: true })
    }
    if (parsed.data.action === 'cancelar') {
        await db.from('part_orders').update({ status: 'cancelado' }).eq('id', id).eq('company_id', companyId)
        return NextResponse.json({ success: true })
    }

    // Receive: lock the order first so a double tap can't add the stock twice.
    const { data: locked } = await db.from('part_orders').update({ status: 'recebido', received_at: new Date().toISOString() }).eq('id', id).eq('company_id', companyId).in('status', ['aberto', 'enviado']).select('id').maybeSingle()
    if (!locked) return bad('Este pedido já foi recebido')

    const arrived = new Map((parsed.data.items ?? []).map(i => [i.id, i]))
    const lines = (order.part_order_items ?? []) as { id: string; inventory_item_id: string; quantity: number; unit_cost: number }[]
    let total = 0
    const received: string[] = []
    for (const line of lines) {
        const a = arrived.get(line.id)
        const qty = a ? a.quantity : Number(line.quantity)
        const cost = a ? a.unit_cost : Number(line.unit_cost)
        if (a) await db.from('part_order_items').update({ quantity: Math.max(qty, 0.001), unit_cost: cost }).eq('id', line.id)
        if (qty <= 0) continue
        total += qty * cost
        received.push(line.inventory_item_id)
        await moveStock(db, companyId, { itemId: line.inventory_item_id, quantity: qty, reason: 'compra', refId: id, unitCost: cost, userId: dbUser.id })
        if (cost > 0) {
            await db.from('inventory_items').update({ cost_price: cost }).eq('id', line.inventory_item_id).eq('company_id', companyId)
            if (order.supplier_id) await db.from('supplier_prices').insert({ company_id: companyId, inventory_item_id: line.inventory_item_id, supplier_id: order.supplier_id, price: cost, source: 'compra' })
        }
    }
    await db.from('part_orders').update({ total: Math.round(total * 100) / 100 }).eq('id', id).eq('company_id', companyId)

    // Orders that were waiting for one of these parts.
    let ready: { id: string; order_number: string; title: string }[] = []
    if (received.length) {
        const { data: waiting } = await db.from('service_orders').select('id, order_number, title, service_order_items(inventory_item_id)').eq('company_id', companyId).eq('status', 'aguardando_pecas').limit(300)
        ready = (waiting ?? [])
            .filter(os => ((os.service_order_items ?? []) as { inventory_item_id: string | null }[]).some(i => i.inventory_item_id && received.includes(i.inventory_item_id)))
            .map(os => ({ id: os.id, order_number: os.order_number, title: os.title }))
        if (ready.length) {
            await db.from('notifications').insert({
                company_id: companyId,
                user_id: dbUser.id,
                type: 'push',
                status: 'pending',
                title: 'Peças chegaram',
                message: `Pode continuar: ${ready.map(o => o.order_number).join(', ')}`,
                related_entity_type: 'part_order',
                related_entity_id: id,
            })
        }
    }
    return NextResponse.json({ success: true, ready_os: ready })
}
