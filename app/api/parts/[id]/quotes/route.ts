import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext, uuid } from '@/lib/parts/server'

type P = { params: Promise<{ id: string }> }

const schema = z.object({ supplier_id: uuid, price: z.coerce.number().min(0).max(1_000_000) })

/** Records a supplier's price for this part (quote), kept as price history. */
export async function POST(req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const [{ data: part }, { data: sup }] = await Promise.all([
        db.from('inventory_items').select('id').eq('id', id).eq('company_id', companyId).maybeSingle(),
        db.from('suppliers').select('id').eq('id', parsed.data.supplier_id).eq('company_id', companyId).maybeSingle(),
    ])
    if (!part || !sup) return bad('Peça ou fornecedor não encontrado', 404)
    const { error } = await db.from('supplier_prices').insert({ company_id: companyId, inventory_item_id: id, supplier_id: parsed.data.supplier_id, price: parsed.data.price, source: 'cotacao' })
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true }, { status: 201 })
}
