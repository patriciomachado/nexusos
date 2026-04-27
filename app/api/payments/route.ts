import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const { data, error, count } = await db.from('payments').select('*, customers(name), service_orders(order_number, title, parts_cost), sales(total_cost)', { count: 'exact' }).eq('company_id', user?.company_id).order('payment_date', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    const body = await req.json()
    const { data, error } = await db.from('payments').insert({ ...body, company_id: user?.company_id, created_by: user?.id }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 1. If there's an open cash register, record a transaction there too
    if (body.payment_status === 'completed') {
        const { data: openRegister } = await db
            .from('cash_registers')
            .select('id')
            .eq('company_id', user?.company_id)
            .eq('status', 'open')
            .maybeSingle()

        if (openRegister) {
            // Map payment method string to ID
            const { data: pm } = await db
                .from('payment_methods')
                .select('id')
                .ilike('code', body.payment_method === 'dinheiro' ? 'CASH' : body.payment_method === 'pix' ? 'PIX' : body.payment_method)
                .maybeSingle()

            // If still no pm, fallback to CASH method for the company or a default one
            let pmId = pm?.id
            if (!pmId) {
                const { data: cashPm } = await db.from('payment_methods').select('id').eq('code', 'CASH').single()
                pmId = cashPm?.id
            }

            await db.from('cash_transactions').insert({
                cash_register_id: openRegister.id,
                company_id: user?.company_id,
                user_id: user?.id,
                type: 'entry',
                amount: body.amount,
                payment_method_id: pmId,
                description: `Recebimento: ${body.notes || 'Manual'}`,
                source_type: body.service_order_id ? 'service_order' : 'manual',
                source_id: body.service_order_id || null
            })
        }
    }

    // Update OS final_cost if linked
    if (body.service_order_id && body.payment_status === 'completed') {
        const { data: existingPayments } = await db.from('payments').select('amount').eq('service_order_id', body.service_order_id).eq('payment_status', 'completed')
        const total = existingPayments?.reduce((s, p) => s + p.amount, 0) || 0
        await db.from('service_orders').update({ final_cost: total }).eq('id', body.service_order_id)
    }

    return NextResponse.json(data, { status: 201 })
}
