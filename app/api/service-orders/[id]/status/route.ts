import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, full_name, company_id').eq('clerk_id', userId).single()
    const body = await req.json()

    const { data: os } = await db
        .from('service_orders')
        .select('status, final_cost, estimated_cost, order_number')
        .eq('id', id)
        .eq('company_id', user?.company_id)
        .single()

    if (!os) return NextResponse.json({ error: 'OS not found' }, { status: 404 })

    const updateData: Record<string, any> = { status: body.status }
    if (body.status === 'em_andamento' && !os.status.includes('andamento')) {
        updateData.started_at = new Date().toISOString()
    }
    if (body.status === 'concluida') {
        updateData.completed_at = new Date().toISOString()
    }
    if (body.status === 'faturada') {
        // Find open cash register
        const { data: openRegister } = await db
            .from('cash_registers')
            .select('id')
            .eq('user_id', user?.id)
            .eq('status', 'open')
            .maybeSingle()

        if (openRegister) {
            const amount = os.final_cost || os.estimated_cost || 0
            const { data: transType } = await db
                .from('transaction_types')
                .select('id')
                .eq('code', 'SERVICE_SALE')
                .single()

            const { data: transaction, error: transError } = await db
                .from('cash_transactions')
                .insert({
                    cash_register_id: openRegister.id,
                    user_id: user?.id,
                    type: 'entry',
                    amount: amount,
                    payment_method_id: body.payment_method_id || 'dinheiro_id_placeholder', // Should be passed from UI
                    transaction_type_id: transType?.id,
                    description: `Pagamento OS #${os.order_number}`,
                    source_type: 'service_order',
                    source_id: id
                })
                .select()
                .single()

            if (!transError && transaction) {
                updateData.cash_transaction_id = transaction.id
                if (body.payment_method_id) {
                    updateData.payment_method_id = body.payment_method_id
                }
            }
        }
    }
    if (body.solution_applied) {
        updateData.solution_applied = body.solution_applied
    }

    await db.from('service_orders').update(updateData).eq('id', id)

    // Log history
    await db.from('service_order_history').insert({
        service_order_id: id,
        changed_by: user?.id,
        changed_by_name: user?.full_name || 'Usuário',
        field_name: 'status',
        old_value: os.status,
        new_value: body.status,
        change_reason: body.reason,
    })

    return NextResponse.json({ success: true })
}
