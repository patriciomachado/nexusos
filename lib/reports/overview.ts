import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, dateStringInZone, DEFAULT_TIMEZONE } from '@/lib/tasks/dates'
import { extraExpenses } from './extra'
import { isExpense, localDay, num, previousPeriod, startOf, summarize, totals, type Row } from './compute'

/**
 * Money for the dashboard, with the same rules as Relatórios (so the numbers
 * match): today vs yesterday, this month so far vs the same number of days
 * before, and revenue per day for the last 30 days.
 */
export async function computeOverview(db: SupabaseClient, companyId: string) {
    const today = dateStringInZone(DEFAULT_TIMEZONE)
    const month = { from: `${today.slice(0, 7)}-01`, to: today }
    const monthPrev = previousPeriod(month)
    const chartFrom = addDays(today, -29)
    const from = [monthPrev.from, chartFrom, addDays(today, -1)].sort()[0]
    const fromIso = startOf(from)
    const toIso = startOf(addDays(today, 1))

    const { data: registers } = await db.from('cash_registers').select('id').eq('company_id', companyId)
    const registerIds = (registers ?? []).map(r => r.id as string)

    const [paymentsRes, salesRes, exitsRes] = await Promise.all([
        db.from('payments').select('amount, payment_date, payment_method, service_order_id, sale_id')
            .eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', fromIso).lt('payment_date', toIso).limit(20000),
        db.from('sales').select('id, total_cost, created_at, status')
            .eq('company_id', companyId).gte('created_at', fromIso).lt('created_at', toIso).limit(20000),
        registerIds.length
            ? db.from('cash_transactions').select('amount, type, source_type, created_at, transaction_types(code, name)')
                .in('cash_register_id', registerIds).eq('type', 'exit').gte('created_at', fromIso).lt('created_at', toIso).limit(20000)
            : Promise.resolve({ data: [] as Row[] }),
    ])

    const payments = (paymentsRes.data ?? []) as Row[]
    const paidOsIds = [...new Set(payments.map(p => p.service_order_id).filter(Boolean) as string[])]
    const osById = new Map<string, Row>()
    for (let i = 0; i < paidOsIds.length; i += 300) {
        const { data } = await db.from('service_orders').select('id, parts_cost').eq('company_id', companyId).in('id', paidOsIds.slice(i, i + 300))
        for (const o of data ?? []) osById.set(o.id as string, o)
    }
    const sales = ((salesRes.data ?? []) as Row[]).filter(s => !['cancelled', 'cancelada', 'canceled'].includes(String(s.status)))
    const exits = [...((exitsRes.data ?? []) as Row[]).filter(isExpense), ...await extraExpenses(db, companyId, fromIso, toIso, payments)]

    const range = (a: string, b: string) => {
        const lo = startOf(a), hi = startOf(addDays(b, 1))
        const inR = (iso: unknown) => String(iso) >= lo && String(iso) < hi
        return summarize(totals(payments.filter(p => inR(p.payment_date)), osById, sales.filter(s => inR(s.created_at)), exits.filter(e => inR(e.created_at))))
    }

    const series = new Map<string, { os: number; pdv: number }>()
    for (let i = 0; i < 30; i++) series.set(addDays(chartFrom, i), { os: 0, pdv: 0 })
    for (const p of payments) {
        const b = series.get(localDay(String(p.payment_date)))
        if (!b) continue
        if (p.service_order_id) b.os += num(p.amount); else b.pdv += num(p.amount)
    }

    return {
        today: range(today, today),
        yesterday: range(addDays(today, -1), addDays(today, -1)),
        month: range(month.from, month.to),
        monthPrev: range(monthPrev.from, monthPrev.to),
        daily: [...series.entries()].map(([date, v]) => ({ date, os: Math.round(v.os * 100) / 100, pdv: Math.round(v.pdv * 100) / 100 })),
    }
}

export type Overview = Awaited<ReturnType<typeof computeOverview>>
