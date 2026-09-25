import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { closingNumbers, isManager, loadCashSettings } from '@/lib/cash/server'
import { sendClosingReport } from '@/lib/cash/report'

/**
 * Closes a register: saves the balance, the cash expected in the drawer,
 * what was counted (optional), the difference and what stays as change for
 * the next opening. Then sends the closing report on WhatsApp when set up.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId, dbUser, role } = ctx

    const body = await req.json().catch(() => ({})) as { counted_cash?: unknown; left_in_drawer?: unknown }
    const money = (v: unknown) => {
        if (v === null || v === undefined || v === '') return null
        const x = Number(v)
        return Number.isFinite(x) && x >= 0 ? Math.round(x * 100) / 100 : null
    }
    const counted = money(body.counted_cash)
    const left = money(body.left_in_drawer)

    const { data: cashRegister, error: fetchError } = await db
        .from('cash_registers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()
    if (fetchError || !cashRegister) {
        return NextResponse.json({ error: 'Caixa não encontrado ou acesso negado.' }, { status: 404 })
    }
    if (cashRegister.status === 'closed') {
        return NextResponse.json({ error: 'Este caixa já está fechado.' }, { status: 400 })
    }
    if (cashRegister.user_id !== dbUser.id && !isManager(role)) {
        return NextResponse.json({ error: 'Só quem abriu este caixa ou o gerente pode fechá-lo.' }, { status: 403 })
    }

    const [{ data: transactions, error: transError }, { cash }] = await Promise.all([
        db.from('cash_transactions').select('type, amount, source_type, payment_methods(name, code)').eq('cash_register_id', id).eq('company_id', companyId),
        loadCashSettings(db, companyId),
    ])
    if (transError) return NextResponse.json({ error: transError.message }, { status: 500 })

    const n = closingNumbers(Number(cashRegister.opening_balance) || 0, transactions ?? [], cash)
    const update: Record<string, unknown> = {
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_balance: n.balance,
        expected_cash: Math.round(n.expectedCash * 100) / 100,
        closed_by: dbUser.id,
    }
    if (counted != null) {
        update.counted_cash = counted
        update.cash_difference = Math.round((counted - n.expectedCash) * 100) / 100
    }
    update.left_in_drawer = left ?? counted ?? null

    let { data: updated, error: updateError } = await db
        .from('cash_registers')
        .update(update)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

    // Database without the closing columns yet: close with the basics.
    if (updateError?.code === 'PGRST204' || updateError?.code === '42703') {
        ({ data: updated, error: updateError } = await db
            .from('cash_registers')
            .update({ status: 'closed', closed_at: update.closed_at, closing_balance: n.balance })
            .eq('id', id)
            .eq('company_id', companyId)
            .select()
            .single())
    }
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    const report = await sendClosingReport(db, companyId, id)
    return NextResponse.json({ ...updated, report })
}
