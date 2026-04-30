import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { recurringExpenseSchema } from '@/lib/validations/schemas'

type P = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { id } = await params
    const { db, companyId } = ctx
    const body = await req.json()

    const validation = recurringExpenseSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await db
        .from('recurring_expenses')
        .update(validation.data)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { id } = await params
    const { db, companyId } = ctx

    const { error } = await db
        .from('recurring_expenses')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
