import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { paymentSchema } from '@/lib/validations/schemas'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    
    const { data, error, count } = await db
        .from('payments')
        .select('*, customers(name), service_orders(order_number, title, parts_cost), sales(total_cost)', { count: 'exact' })
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })
        .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const body = await req.json()
    
    const validation = paymentSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await db
        .from('payments')
        .insert({ 
            ...validation.data, 
            company_id: companyId, 
            created_by: dbUser.id 
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 1. If there's an open cash register, record a transaction there too
    if (validation.data.payment_status === 'completed') {
        const { data: openRegister } = await db
            .from('cash_registers')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'open')
            .maybeSingle()

        if (openRegister) {
            // Map payment method string to ID
            const { data: pm } = await db
                .from('payment_methods')
                .select('id')
                .ilike('code', validation.data.payment_method === 'dinheiro' ? 'CASH' : validation.data.payment_method === 'pix' ? 'PIX' : validation.data.payment_method)
                .maybeSingle()

            // If still no pm, fallback to CASH method for the company or a default one
            let pmId = pm?.id
            if (!pmId) {
                const { data: cashPm } = await db.from('payment_methods').select('id').eq('code', 'CASH').single()
                pmId = cashPm?.id
            }

            await db.from('cash_transactions').insert({
                cash_register_id: openRegister.id,
                company_id: companyId,
                user_id: dbUser.id,
                type: 'entry',
                amount: validation.data.amount,
                payment_method_id: pmId,
                description: `Recebimento: ${validation.data.notes || 'Manual'}`,
                source_type: validation.data.service_order_id ? 'service_order' : 'manual',
                source_id: validation.data.service_order_id || null
            })
        }
    }

    // Update OS final_cost if linked
    if (validation.data.service_order_id && validation.data.payment_status === 'completed') {
        const { data: existingPayments } = await db
            .from('payments')
            .select('amount')
            .eq('service_order_id', validation.data.service_order_id)
            .eq('payment_status', 'completed')
            .eq('company_id', companyId)
        
        const total = existingPayments?.reduce((s, p) => s + p.amount, 0) || 0
        await db
            .from('service_orders')
            .update({ final_cost: total })
            .eq('id', validation.data.service_order_id)
            .eq('company_id', companyId)
    }

    return NextResponse.json(data, { status: 201 })
}
