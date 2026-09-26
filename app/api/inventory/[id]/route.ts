import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { inventoryItemSchema, idSchema } from '@/lib/validations/schemas'
import { logMovement } from '@/lib/inventory/movements'
import { withoutNewColumns } from '@/lib/inventory/columns'

type P = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    
    const { id } = await params
    const { db, companyId } = ctx
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { data, error } = await db
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()
        
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    
    const { id } = await params
    const { db, companyId, dbUser } = ctx
    const body = await req.json()
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const validation = inventoryItemSchema.partial().safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data: before } = await db.from('inventory_items').select('quantity_in_stock').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!before) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    const update = (row: Record<string, unknown>) => db.from('inventory_items').update(row).eq('id', id).eq('company_id', companyId).select().single()
    let { data, error } = await update(validation.data)
    if (error && withoutNewColumns.applies(error)) ({ data, error } = await update(withoutNewColumns.strip(validation.data)))

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const diff = Number(data?.quantity_in_stock ?? 0) - Number(before.quantity_in_stock ?? 0)
    if (diff) await logMovement(db, { companyId, itemId: id, quantity: diff, balance: Number(data?.quantity_in_stock ?? 0), kind: 'ajuste', reason: 'Alterado no cadastro do produto', userId: dbUser.id })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    
    const { id } = await params
    const { db, companyId } = ctx
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { error } = await db
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', id)
        .eq('company_id', companyId)
        
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
