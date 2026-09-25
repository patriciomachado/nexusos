import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'
import { isDay, isMissingTable, missingMigration, money } from '@/lib/cash/bills'

/** Contas a pagar: open ones plus those paid in the last 60 days. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const { data, error } = await ctx.db
        .from('bills')
        .select('*')
        .eq('company_id', ctx.companyId)
        .or(`status.eq.open,paid_at.gte.${since}`)
        .neq('status', 'cancelled')
        .order('due_date')
        .limit(500)
    if (isMissingTable(error)) return missingMigration()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const description = String(body.description ?? '').trim().slice(0, 120)
    const amount = money(body.amount)
    if (!description) return NextResponse.json({ error: 'Diga que conta é.' }, { status: 400 })
    if (!amount) return NextResponse.json({ error: 'Informe o valor.' }, { status: 400 })
    if (!isDay(body.due_date)) return NextResponse.json({ error: 'Informe o vencimento.' }, { status: 400 })
    const { data, error } = await ctx.db.from('bills').insert({
        company_id: ctx.companyId,
        description,
        amount,
        due_date: body.due_date,
        repeat_monthly: !!body.repeat_monthly,
        notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) || null : null,
        created_by: ctx.dbUser.id,
    }).select().single()
    if (isMissingTable(error)) return missingMigration()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
