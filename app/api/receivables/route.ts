import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'
import { isDay, money, nextMonth } from '@/lib/cash/bills'

/**
 * Contas a receber: payments still pending (fiado, crediário, OS to pay
 * later). Received ones count as revenue on the day they're received.
 */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { data, error } = await ctx.db
        .from('payments')
        .select('id, amount, due_date, payment_date, installments, notes, created_at, customer_id, service_order_id, sale_id, customers(name, phone), service_orders(order_number)')
        .eq('company_id', ctx.companyId)
        .eq('payment_status', 'pending')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
}

/** New fiado: the total split into monthly installments. */
export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const customerId = typeof body.customer_id === 'string' ? body.customer_id : ''
    const total = money(body.amount)
    const count = Math.min(Math.max(Math.round(Number(body.installments) || 1), 1), 24)
    if (!customerId) return NextResponse.json({ error: 'Escolha o cliente.' }, { status: 400 })
    if (!total) return NextResponse.json({ error: 'Informe o valor.' }, { status: 400 })
    if (!isDay(body.first_due)) return NextResponse.json({ error: 'Informe o primeiro vencimento.' }, { status: 400 })

    const { data: customer } = await ctx.db.from('customers').select('id').eq('id', customerId).eq('company_id', ctx.companyId).maybeSingle()
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })

    const note = typeof body.notes === 'string' ? body.notes.trim().slice(0, 300) : ''
    const base = Math.floor((total / count) * 100) / 100
    const rows = []
    let due = body.first_due as string
    const day = Number(due.slice(8, 10))
    for (let i = 0; i < count; i++) {
        const amount = i === count - 1 ? Math.round((total - base * (count - 1)) * 100) / 100 : base
        rows.push({
            company_id: ctx.companyId,
            customer_id: customerId,
            amount,
            payment_method: 'crediario',
            payment_status: 'pending',
            payment_date: new Date().toISOString(),
            due_date: due,
            installments: count,
            notes: [count > 1 ? `Parcela ${i + 1}/${count}` : 'Fiado', note].filter(Boolean).join(' · '),
            created_by: ctx.dbUser.id,
        })
        due = nextMonth(due, day)
    }
    const { data, error } = await ctx.db.from('payments').insert(rows).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
}
