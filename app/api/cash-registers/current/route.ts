import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'

const noStore = { headers: { 'Cache-Control': 'no-store, max-age=0' } }

/**
 * The open register for this user.
 * - default: their own open register, else the store's most recent one
 *   (PDV and OS payments land there too);
 * - ?mine=1: only their own;
 * - ?id=…: a specific register (managers, or its owner).
 * A register left open from an earlier day/month is closed automatically
 * when the store uses "fechar sozinho".
 */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser, role } = ctx
    const params = new URL(req.url).searchParams
    const id = params.get('id')
    const mine = params.get('mine') === '1'

    const { data: company, error: companyError } = await db
        .from('companies')
        .select('cash_cycle, auto_close_cash')
        .eq('id', companyId)
        .single()
    if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })

    let query = db.from('cash_registers').select('*, users!user_id(full_name)').eq('company_id', companyId)
    if (id) query = query.eq('id', id)
    else query = query.eq('status', 'open').order('opened_at', { ascending: false }).limit(20)
    const { data: rows, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const list = rows ?? []
    let cashRegister = id
        ? list[0] ?? null
        : list.find(r => r.user_id === dbUser.id) ?? (mine ? null : list[0] ?? null)

    if (cashRegister && id && cashRegister.user_id !== dbUser.id && !isManager(role)) {
        return NextResponse.json({ error: 'Sem permissão para ver este caixa.' }, { status: 403 })
    }

    // Auto-close a register from an earlier day (or month).
    if (cashRegister && cashRegister.status === 'open' && company.auto_close_cash) {
        const openedAt = new Date(cashRegister.opened_at)
        const now = new Date()
        const key = (d: Date) => company.cash_cycle === 'monthly'
            ? d.toLocaleDateString('pt-BR', { month: 'numeric', year: 'numeric', timeZone: 'America/Sao_Paulo' })
            : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        if (key(openedAt) !== key(now)) {
            const { data: transactions } = await db.from('cash_transactions').select('amount, type').eq('cash_register_id', cashRegister.id)
            let balance = Number(cashRegister.opening_balance)
            transactions?.forEach(tx => { balance += tx.type === 'entry' ? Number(tx.amount) : -Number(tx.amount) })
            const { error: closeError } = await db
                .from('cash_registers')
                .update({ status: 'closed', closed_at: now.toISOString(), closing_balance: balance })
                .eq('id', cashRegister.id)
            if (!closeError) cashRegister = null
        }
    }

    return NextResponse.json(cashRegister, noStore)
}
