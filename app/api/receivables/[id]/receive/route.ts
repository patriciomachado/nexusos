import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { findOpenRegister, isManager } from '@/lib/cash/server'

const METHOD_STRING: Record<string, string> = {
    CASH: 'dinheiro', PIX: 'pix', DEBIT_CARD: 'cartao_debito', CREDIT_CARD: 'cartao_credito', CHEQUE: 'transferencia', INSTALLMENT: 'crediario',
}

/**
 * Marks a receivable as received today. With a register open (the user's
 * own, else the store's), the money also enters the register.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { db, companyId, dbUser } = ctx
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    const { data: p } = await db.from('payments').select('*, customers(name), service_orders(order_number)').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!p) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })
    if (p.payment_status !== 'pending') return NextResponse.json({ error: 'Esta conta já foi recebida.' }, { status: 400 })

    const methodId = typeof body.payment_method_id === 'string' ? body.payment_method_id : null
    const { data: method } = methodId
        ? await db.from('payment_methods').select('id, code, name').eq('id', methodId).maybeSingle()
        : await db.from('payment_methods').select('id, code, name').eq('code', 'CASH').limit(1).maybeSingle()
    if (!method) return NextResponse.json({ error: 'Escolha a forma de pagamento.' }, { status: 400 })

    const now = new Date().toISOString()
    const { error } = await db.from('payments').update({
        payment_status: 'completed',
        payment_date: now,
        payment_method: METHOD_STRING[(method.code || '').toUpperCase()] ?? String(method.name).toLowerCase(),
        updated_at: now,
    }).eq('id', id).eq('company_id', companyId).eq('payment_status', 'pending')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let inRegister = false
    if (body.to_register !== false) {
        const register = await findOpenRegister(db, companyId, dbUser.id)
        if (register) {
            const customer = (Array.isArray(p.customers) ? p.customers[0] : p.customers)?.name
            const os = (Array.isArray(p.service_orders) ? p.service_orders[0] : p.service_orders)?.order_number
            const { error: txError } = await db.from('cash_transactions').insert({
                company_id: companyId,
                cash_register_id: register.id,
                type: 'entry',
                amount: p.amount,
                payment_method_id: method.id,
                description: `Recebido de ${customer ?? 'cliente'}${os ? ` · OS ${os}` : ''}${p.notes ? ` · ${p.notes}` : ''}`,
                source_type: 'receivable',
                source_id: p.id,
                user_id: dbUser.id,
            })
            inRegister = !txError
            if (txError) console.error('[receivables] cash entry failed:', txError)
        }
    }
    return NextResponse.json({ ok: true, in_register: inRegister })
}
