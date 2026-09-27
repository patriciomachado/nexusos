import { NextRequest, NextResponse } from 'next/server'
import { bad, firstIssue, partSchema, partsContext, uuid } from '@/lib/parts/server'

type P = { params: Promise<{ id: string }> }

/** One part: details, recent movements, supplier prices and defects. */
export async function GET(_req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const { data: part } = await db.from('inventory_items').select('*, suppliers(name, phone)').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!part) return bad('Peça não encontrada', 404)
    const [{ data: movements }, { data: quotes }, { data: defects }] = await Promise.all([
        db.from('stock_movements').select('id, quantity, reason, notes, unit_cost, source_type, source_id, created_at, users(full_name)').eq('company_id', companyId).eq('inventory_item_id', id).order('created_at', { ascending: false }).limit(40),
        db.from('supplier_prices').select('id, price, source, created_at, supplier_id, suppliers(name, phone)').eq('company_id', companyId).eq('inventory_item_id', id).order('created_at', { ascending: false }).limit(60),
        db.from('part_defects').select('id, quantity, reason, resolution, created_at, suppliers(name)').eq('company_id', companyId).eq('inventory_item_id', id).order('created_at', { ascending: false }).limit(20),
    ])
    return NextResponse.json({ part, movements: movements ?? [], quotes: quotes ?? [], defects: defects ?? [] })
}

export async function PATCH(req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const parsed = partSchema.partial().safeParse(body)
    if (!parsed.success) return bad(firstIssue(parsed.error))
    // Only the fields that were sent (schema defaults must not overwrite the rest).
    const update = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => k in body))
    if (parsed.data.supplier_id) {
        const { data: s } = await db.from('suppliers').select('id').eq('id', parsed.data.supplier_id).eq('company_id', companyId).maybeSingle()
        if (!s) return bad('Fornecedor não encontrado')
    }
    const { data, error } = await db.from('inventory_items').update(update).eq('id', id).eq('company_id', companyId).eq('kind', 'peca').select('id').maybeSingle()
    if (error) return bad(error.message, 500)
    if (!data) return bad('Peça não encontrada', 404)
    return NextResponse.json({ success: true })
}

/** Parts are archived, not deleted, so old OS keep their history. */
export async function DELETE(_req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const { error } = await db.from('inventory_items').update({ is_active: false }).eq('id', id).eq('company_id', companyId).eq('kind', 'peca')
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true })
}
