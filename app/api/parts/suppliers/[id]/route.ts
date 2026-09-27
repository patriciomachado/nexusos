import { NextRequest, NextResponse } from 'next/server'
import { bad, firstIssue, partsContext, supplierSchema, uuid } from '@/lib/parts/server'

type P = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const parsed = supplierSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const { error } = await db.from('suppliers').update(parsed.data).eq('id', id).eq('company_id', companyId)
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true })
}

/** Archived so old orders, prices and defects keep the name. */
export async function DELETE(_req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const { error } = await db.from('suppliers').update({ is_active: false }).eq('id', id).eq('company_id', companyId)
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true })
}
