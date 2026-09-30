import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { findOpenRegister, isManager } from '@/lib/cash/server'
import { money, nextMonth } from '@/lib/cash/bills'

/**
 * Pays a bill from the register (a cash exit) or from the bank (outside the
 * register; still counts as an expense in the reports). A monthly bill
 * creates next month's one.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { db, companyId, dbUser } = ctx

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const from = body.from === 'cash' ? 'cash' : 'bank'

    const { data: bill } = await db.from('bills').select('*').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!bill) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })
    if (bill.status !== 'open') return NextResponse.json({ error: 'Esta conta já foi paga.' }, { status: 400 })
    const amount = money(body.amount) ?? Number(bill.amount)

    let cashTransactionId: string | null = null
    if (from === 'cash') {
        const register = await findOpenRegister(db, companyId, dbUser.id)
        if (!register) return NextResponse.json({ error: 'Abra o caixa para pagar com o dinheiro dele, ou marque "pago pelo banco".' }, { status: 400 })
        let methodId = typeof body.payment_method_id === 'string' ? body.payment_method_id : null
        if (!methodId) {
            const { data: methods } = await db.from('payment_methods').select('id, code').eq('code', 'CASH').limit(1)
            methodId = methods?.[0]?.id ?? null
        }
        const { data: expType } = await db.from('transaction_types').select('id').eq('code', 'EXPENSE').maybeSingle()
        const { data: tx, error: txError } = await db.from('cash_transactions').insert({
            company_id: companyId,
            cash_register_id: register.id,
            type: 'exit',
            amount,
            payment_method_id: methodId,
            transaction_type_id: expType?.id ?? null,
            description: `Conta paga: ${bill.description}`,
            source_type: 'bill',
            source_id: bill.id,
            user_id: dbUser.id,
        }).select('id').single()
        if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
        cashTransactionId = tx.id
    }

    const { error } = await db.from('bills').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_amount: amount,
        paid_from: from,
        cash_transaction_id: cashTransactionId,
        updated_at: new Date().toISOString(),
    }).eq('id', id).eq('company_id', companyId).eq('status', 'open')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let next = null
    if (bill.repeat_monthly) {
        const preferred = Number(String(bill.due_date).slice(8, 10))
        const { data } = await db.from('bills').insert({
            company_id: companyId,
            description: bill.description,
            amount: bill.amount,
            due_date: nextMonth(bill.due_date, preferred),
            repeat_monthly: true,
            recurring_expense_id: bill.recurring_expense_id,
            notes: bill.notes,
            created_by: dbUser.id,
        }).select().single()
        next = data
    }
    return NextResponse.json({ ok: true, next })
}
