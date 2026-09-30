import { NextRequest, NextResponse } from 'next/server'
import { bad, firstIssue, partsContext, priceSchema, uuid } from '@/lib/parts/server'

type P = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const parsed = priceSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    if (parsed.data.part_item_id) {
        const { data: p } = await db.from('inventory_items').select('id').eq('id', parsed.data.part_item_id).eq('company_id', companyId).maybeSingle()
        if (!p) return bad('Peça não encontrada')
    }
    const { error } = await db.from('repair_prices').update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', id).eq('company_id', companyId)
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const { error } = await db.from('repair_prices').delete().eq('id', id).eq('company_id', companyId)
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true })
}
