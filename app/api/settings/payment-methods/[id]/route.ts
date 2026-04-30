import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { paymentMethodSchema, idSchema } from '@/lib/validations/schemas'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await req.json()
    const validation = paymentMethodSchema.partial().safeParse(body)
    
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    // Check if it's a system default or company specific
    const { data: pm, error: fetchError } = await db
        .from('payment_methods')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !pm) {
        return NextResponse.json({ error: 'Método de pagamento não encontrado' }, { status: 404 })
    }

    if (pm.company_id === null) {
        return NextResponse.json({ error: 'Não é possível editar meios de pagamento do sistema. Crie um novo personalizado.' }, { status: 403 })
    }

    if (pm.company_id !== companyId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { data, error } = await db
        .from('payment_methods')
        .update(validation.data)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { data: pm } = await db
        .from('payment_methods')
        .select('*')
        .eq('id', id)
        .single()

    if (!pm) {
        return NextResponse.json({ error: 'Método de pagamento não encontrado' }, { status: 404 })
    }

    if (pm.company_id === null) {
        return NextResponse.json({ error: 'Não é possível excluir meios de pagamento do sistema.' }, { status: 403 })
    }

    if (pm.company_id !== companyId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { error } = await db
        .from('payment_methods')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
