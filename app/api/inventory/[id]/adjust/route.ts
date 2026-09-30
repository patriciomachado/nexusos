import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema, inventoryAdjustSchema } from '@/lib/validations/schemas'
import { logMovement } from '@/lib/inventory/movements'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const body = await req.json()

    const validation = inventoryAdjustSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data: item } = await db
        .from('inventory_items')
        .select('quantity_in_stock, cost_price')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

    if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

    const newQty = Number(item.quantity_in_stock) + Number(validation.data.quantity)
    if (newQty < 0) return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })

    const { data, error } = await db
        .from('inventory_items')
        .update({ quantity_in_stock: newQty })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const q = Number(validation.data.quantity)
    await logMovement(db, {
        companyId, itemId: id, quantity: q, balance: newQty,
        kind: validation.data.kind ?? (q > 0 ? 'entrada' : 'saida'),
        reason: validation.data.reason,
        unitCost: q > 0 ? (validation.data.unit_cost ?? Number(item.cost_price) ?? null) : null,
        userId: dbUser.id,
    })
    // A purchase at a new cost updates the product's cost.
    if (q > 0 && validation.data.unit_cost != null && validation.data.unit_cost > 0 && validation.data.unit_cost !== Number(item.cost_price)) {
        await db.from('inventory_items').update({ cost_price: validation.data.unit_cost }).eq('id', id).eq('company_id', companyId)
    }
    return NextResponse.json(data)
}

