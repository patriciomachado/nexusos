import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext, uuid } from '@/lib/parts/server'
import { deletePartQuote, markQuoteConverted } from '@/lib/parts/quotes'

type P = { params: Promise<{ id: string }> }

const schema = z.object({ order_number: z.string().trim().min(1, 'Informe o número da OS') })

/** Marca na mão um orçamento como convertido, pra quando a OS não foi aberta pelo campo "veio de um orçamento". */
export async function PATCH(req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const wanted = parsed.data.order_number.replace(/\D/g, '')
    const { data: order } = await db.from('service_orders').select('id, order_number').eq('company_id', companyId).ilike('order_number', `%${wanted}%`).limit(1).maybeSingle()
    if (!order) return bad('OS não encontrada com esse número')
    await markQuoteConverted(db, companyId, id, order.id)
    return NextResponse.json({ success: true })
}

/** Apaga um orçamento (e cancela o lembrete pendente dele, se ainda não disparou). */
export async function DELETE(_req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const ok = await deletePartQuote(db, companyId, id)
    if (!ok) return bad('Não foi possível apagar o orçamento', 500)
    return NextResponse.json({ success: true })
}
