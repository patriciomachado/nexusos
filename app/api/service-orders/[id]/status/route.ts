import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema, osStatusUpdateSchema } from '@/lib/validations/schemas'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const body = await req.json()

    const validation = osStatusUpdateSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { status, reason, solution_applied, payment_method_id } = validation.data

    const { data: os } = await db
        .from('service_orders')
        .select('status, final_cost, estimated_cost, order_number, customer_id, parts_cost, labor_cost')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

    if (!os) return NextResponse.json({ error: 'OS not found' }, { status: 404 })

    // Buscar custos dos itens diretamente para garantir precisão
    const { data: osItems } = await db
        .from('service_order_items')
        .select('total_cost')
        .eq('service_order_id', id)

    const calculatedPartsCost = osItems?.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0) || os.parts_cost || 0

    const updateData: Record<string, any> = { status }
    if (status === 'em_andamento' && !os.status.includes('andamento')) {
        updateData.started_at = new Date().toISOString()
    }
    if (status === 'concluida') {
        updateData.completed_at = new Date().toISOString()
    }
    if (status === 'faturada') {
        const amount = os.final_cost || os.estimated_cost || 0

        // 1. Create Payment record (for Global Financial History)
        const { data: pmData } = await db
            .from('payment_methods')
            .select('code')
            .eq('id', payment_method_id)
            .or(`company_id.eq.${companyId},company_id.is.null`)
            .single()

        const methodMap: Record<string, string> = {
            'CASH': 'dinheiro',
            'DEBIT_CARD': 'cartao_debito',
            'CREDIT_CARD': 'cartao_credito',
            'PIX': 'pix',
            'CHEQUE': 'transferencia',
            'INSTALLMENT': 'crediario'
        }
        
        await db.from('payments').insert({
            company_id: companyId,
            customer_id: os.customer_id,
            service_order_id: id,
            amount: amount,
            payment_method: methodMap[pmData?.code || ''] || 'dinheiro',
            payment_status: 'completed',
            payment_date: new Date().toISOString(),
            created_by: dbUser.id,
            notes: `Pagamento automático OS #${os.order_number}`
        })

        // 2. Create Cash Transaction (for the Drawer/Register)
        const { data: openRegisters } = await db
            .from('cash_registers')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })

        const openRegister = openRegisters && openRegisters.length > 0 ? openRegisters[0] : null

        if (openRegister) {
            const { data: transType } = await db
                .from('transaction_types')
                .select('id')
                .eq('code', 'SERVICE_SALE')
                .single()

            const { data: transaction, error: transError } = await db
                .from('cash_transactions')
                .insert({
                    cash_register_id: openRegister.id,
                    company_id: companyId,
                    user_id: dbUser.id,
                    type: 'entry',
                    amount: amount,
                    payment_method_id: payment_method_id,
                    transaction_type_id: transType?.id,
                    description: `Pagamento OS #${os.order_number}`,
                    source_type: 'service_order',
                    source_id: id
                })
                .select()
                .single()

            if (!transError && transaction) {
                updateData.cash_transaction_id = transaction.id
                if (payment_method_id) {
                    updateData.payment_method_id = payment_method_id
                }
                
                // Atualizar custos na OS com valores calculados dos itens
                updateData.parts_cost = calculatedPartsCost

                // Registrar custo de peças como saída (despesa) no caixa
                if (calculatedPartsCost > 0) {
                    await db.from('cash_transactions').insert({
                        cash_register_id: openRegister.id,
                        company_id: companyId,
                        user_id: dbUser.id,
                        type: 'exit',
                        amount: calculatedPartsCost,
                        payment_method_id: payment_method_id,
                        description: `Custo de Peças OS #${os.order_number}`,
                        source_type: 'service_order',
                        source_id: id
                    })
                }
            }
        }
    }
    if (solution_applied) {
        updateData.solution_applied = solution_applied
    }

    await db.from('service_orders').update(updateData).eq('id', id).eq('company_id', companyId)

    // Log history
    await db.from('service_order_history').insert({
        service_order_id: id,
        changed_by: dbUser.id,
        changed_by_name: dbUser.full_name || 'Usuário',
        field_name: 'status',
        old_value: os.status,
        new_value: status,
        change_reason: reason,
    })

    return NextResponse.json({ success: true })
}

