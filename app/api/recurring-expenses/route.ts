import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { recurringExpenseSchema } from '@/lib/validations/schemas'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx

    const { data, error } = await db
        .from('recurring_expenses')
        .select(`
            *,
            transaction_types(name, code),
            payment_methods(name, code)
        `)
        .eq('company_id', companyId)
        .order('day_of_month', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const body = await req.json()

    const validation = recurringExpenseSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await db
        .from('recurring_expenses')
        .insert({
            ...validation.data,
            company_id: companyId
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
}
