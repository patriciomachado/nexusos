import { NextRequest, NextResponse } from 'next/server'
import { bad, firstIssue, partSchema, partsContext } from '@/lib/parts/server'
import { moveStock } from '@/lib/parts/stock'

const FIELDS = 'id, name, sku, barcode, category, device_model, part_quality, location, cost_price, selling_price, quantity_in_stock, minimum_quantity, supplier_id, is_active, updated_at, suppliers(name)'

/** Parts in stock (inventory items marked as 'peca'). */
export async function GET() {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { data, error } = await db.from('inventory_items').select(FIELDS).eq('company_id', companyId).eq('kind', 'peca').eq('is_active', true).order('name').limit(2000)
    if (error) return bad(error.message, 500)
    return NextResponse.json({ parts: data ?? [] })
}

export async function POST(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId, dbUser } = g.ctx
    const body = await req.json().catch(() => ({}))
    const parsed = partSchema.safeParse(body)
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const initial = Math.max(Number(body.quantity) || 0, 0)
    if (parsed.data.supplier_id) {
        const { data: s } = await db.from('suppliers').select('id').eq('id', parsed.data.supplier_id).eq('company_id', companyId).maybeSingle()
        if (!s) return bad('Fornecedor não encontrado')
    }
    const { data, error } = await db.from('inventory_items').insert({
        ...parsed.data,
        company_id: companyId,
        kind: 'peca',
        unit: 'un',
        quantity_in_stock: 0,
        is_active: true,
    }).select(FIELDS).single()
    if (error || !data) return bad(error?.message ?? 'Não foi possível cadastrar', 500)
    if (initial > 0) {
        await moveStock(db, companyId, { itemId: data.id, quantity: initial, reason: 'entrada', unitCost: parsed.data.cost_price, userId: dbUser.id, notes: 'Estoque inicial' })
        data.quantity_in_stock = initial
    }
    return NextResponse.json({ part: data }, { status: 201 })
}
