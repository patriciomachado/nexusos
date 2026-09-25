import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, diffDays, dateStringInZone, DEFAULT_TIMEZONE } from '@/lib/tasks/dates'

/**
 * Store reports for a period, with the same-length previous period for
 * comparison. Definitions (so the numbers agree with the cash register):
 * - Revenue: completed payments (OS billed + PDV sales) by payment date.
 * - Cost of sales: parts of the billed OS + cost of the products sold.
 * - Expenses: cash exits that aren't a cost of sale or a withdrawal
 *   (fixed bills, manual expenses…). A "sangria" moves cash, it isn't spending.
 */

export type Row = Record<string, unknown>
export const num = (v: unknown) => Number(v ?? 0) || 0

/** Local (Brasília) day → instant. Brasília has no DST since 2019. */
export const startOf = (day: string) => new Date(`${day}T00:00:00-03:00`).toISOString()
export const localDay = (iso: string) => dateStringInZone(DEFAULT_TIMEZONE, new Date(iso))
const hoursBetween = (a?: unknown, b?: unknown) => {
    if (!a || !b) return null
    const h = (new Date(String(b)).getTime() - new Date(String(a)).getTime()) / 3_600_000
    return h >= 0 && Number.isFinite(h) ? h : null
}
const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null)
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}

export interface Period { from: string; to: string }

export function previousPeriod({ from, to }: Period): Period {
    const len = diffDays(from, to) + 1
    return { from: addDays(from, -len), to: addDays(from, -1) }
}

export interface Totals {
    revenue: number
    revenueOs: number
    revenuePdv: number
    costParts: number
    costProducts: number
    expenses: number
    osPaid: number
    sales: number
}

export function totals(payments: Row[], osById: Map<string, Row>, sales: Row[], exits: Row[]): Totals {
    const osIds = new Set<string>()
    const saleIds = new Set<string>()
    let revenueOs = 0, revenuePdv = 0, looseSales = 0
    for (const p of payments) {
        if (p.service_order_id) { revenueOs += num(p.amount); osIds.add(String(p.service_order_id)) }
        else {
            revenuePdv += num(p.amount)
            // A split payment is one sale: count distinct sales, not payment rows.
            if (p.sale_id) saleIds.add(String(p.sale_id)); else looseSales++
        }
    }
    const costParts = [...osIds].reduce((s, id) => s + num(osById.get(id)?.parts_cost), 0)
    const costProducts = sales.reduce((s, x) => s + num(x.total_cost), 0)
    const expenses = exits.reduce((s, x) => s + num(x.amount), 0)
    return { revenue: revenueOs + revenuePdv, revenueOs, revenuePdv, costParts, costProducts, expenses, osPaid: osIds.size, sales: saleIds.size + looseSales }
}

export function isExpense(tx: Row) {
    if (tx.type !== 'exit') return false
    const source = tx.source_type as string | null
    if (source === 'service_order' || source === 'product_sale' || source === 'manual_sangria') return false
    const code = (Array.isArray(tx.transaction_types) ? tx.transaction_types[0] : tx.transaction_types as Row | null)?.code
    return code !== 'SANGRIA'
}

function expenseCategory(tx: Row) {
    if (tx.source_type === 'recurring_expense') return 'Contas fixas'
    const type = (Array.isArray(tx.transaction_types) ? tx.transaction_types[0] : tx.transaction_types as Row | null)
    const name = String(type?.name ?? '')
    return name && type?.code !== 'EXPENSE' ? name : 'Despesas avulsas'
}

export function summarize(t: Totals) {
    const gross = t.revenue - t.costParts - t.costProducts
    const net = gross - t.expenses
    const tickets = t.osPaid + t.sales
    return { revenue: t.revenue, gross, net, margin: t.revenue ? net / t.revenue : null, tickets, ticketAvg: tickets ? t.revenue / tickets : null, osPaid: t.osPaid, sales: t.sales }
}

export async function computeReport(db: SupabaseClient, companyId: string, period: Period) {
    const prev = previousPeriod(period)
    const fromIso = startOf(period.from)
    const toIso = startOf(addDays(period.to, 1))
    const prevFromIso = startOf(prev.from)
    const today = dateStringInZone(DEFAULT_TIMEZONE)

    const { data: registers } = await db.from('cash_registers').select('id').eq('company_id', companyId)
    const registerIds = (registers ?? []).map(r => r.id as string)

    const [paymentsRes, salesRes, exitsRes, createdOsRes, techsRes, companyRes, newCustRes, prevNewCustRes] = await Promise.all([
        db.from('payments').select('amount, payment_date, service_order_id, sale_id, customer_id')
            .eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', prevFromIso).lt('payment_date', toIso).limit(20000),
        db.from('sales').select('id, total_cost, final_amount, created_at, status')
            .eq('company_id', companyId).gte('created_at', prevFromIso).lt('created_at', toIso).limit(20000),
        registerIds.length
            ? db.from('cash_transactions').select('amount, type, source_type, description, created_at, transaction_types(code, name)')
                .in('cash_register_id', registerIds).eq('type', 'exit').gte('created_at', prevFromIso).lt('created_at', toIso).limit(20000)
            : Promise.resolve({ data: [] as Row[] }),
        db.from('service_orders').select('id, status, created_at, started_at, completed_at, technician_id')
            .eq('company_id', companyId).gte('created_at', fromIso).lt('created_at', toIso).limit(20000),
        db.from('technicians').select('id, name, commission_type, commission_value, is_active').eq('company_id', companyId),
        db.from('companies').select('settings').eq('id', companyId).single(),
        db.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', fromIso).lt('created_at', toIso),
        db.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', prevFromIso).lt('created_at', fromIso),
    ])

    const payments = (paymentsRes.data ?? []) as Row[]
    const inCurrent = (iso: unknown) => String(iso) >= fromIso
    const curPayments = payments.filter(p => inCurrent(p.payment_date))
    const prevPayments = payments.filter(p => !inCurrent(p.payment_date))

    // OS behind the payments (costs, technician, timings).
    const paidOsIds = [...new Set(payments.map(p => p.service_order_id).filter(Boolean) as string[])]
    const osById = new Map<string, Row>()
    for (let i = 0; i < paidOsIds.length; i += 300) {
        const { data } = await db.from('service_orders')
            .select('id, parts_cost, technician_id, created_at, started_at, completed_at')
            .eq('company_id', companyId).in('id', paidOsIds.slice(i, i + 300))
        for (const o of data ?? []) osById.set(o.id as string, o)
    }

    const sales = ((salesRes.data ?? []) as Row[]).filter(s => !['cancelled', 'cancelada', 'canceled'].includes(String(s.status)))
    const exits = ((exitsRes.data ?? []) as Row[]).filter(isExpense)
    const cur = totals(curPayments, osById, sales.filter(s => inCurrent(s.created_at)), exits.filter(e => inCurrent(e.created_at)))
    const before = totals(prevPayments, osById, sales.filter(s => !inCurrent(s.created_at)), exits.filter(e => !inCurrent(e.created_at)))


    // DRE lines for the current period.
    const expenseGroups = new Map<string, number>()
    for (const e of exits.filter(x => inCurrent(x.created_at))) {
        const k = expenseCategory(e)
        expenseGroups.set(k, (expenseGroups.get(k) ?? 0) + num(e.amount))
    }

    // Daily (or monthly, for long ranges) revenue by source.
    const days = diffDays(period.from, period.to) + 1
    const monthly = days > 62
    const bucket = (iso: string) => (monthly ? localDay(iso).slice(0, 7) : localDay(iso))
    const series = new Map<string, { os: number; pdv: number }>()
    if (monthly) {
        for (let d = period.from; d <= period.to; d = addDays(`${d.slice(0, 7)}-01`, 32).slice(0, 7) + '-01') series.set(d.slice(0, 7), { os: 0, pdv: 0 })
    } else {
        for (let i = 0; i < days; i++) series.set(addDays(period.from, i), { os: 0, pdv: 0 })
    }
    for (const p of curPayments) {
        const b = series.get(bucket(String(p.payment_date)))
        if (!b) continue
        if (p.service_order_id) b.os += num(p.amount); else b.pdv += num(p.amount)
    }

    // Monthly goal (settings.revenue_goal), shown when the period is the current month.
    const settings = (companyRes.data?.settings ?? {}) as Row
    const goal = num(settings.revenue_goal) || null
    const isCurrentMonth = period.from === `${today.slice(0, 7)}-01` && period.to >= today
    let goalInfo: { goal: number; progress: number; projection: number } | null = null
    if (goal && isCurrentMonth) {
        const [y, m] = today.split('-').map(Number)
        const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
        const elapsed = Number(today.slice(8, 10))
        goalInfo = { goal, progress: cur.revenue / goal, projection: (cur.revenue / elapsed) * daysInMonth }
    }

    // OS funnel (OS opened in the period, where they stand now) and stage times.
    const createdOs = (createdOsRes.data ?? []) as Row[]
    const paidAt = new Map<string, string>()
    for (const p of payments) if (p.service_order_id && !paidAt.has(String(p.service_order_id))) paidAt.set(String(p.service_order_id), String(p.payment_date))
    const stageOf = (s: string) => (['aberta', 'agendada'].includes(s) ? 'open' : ['em_andamento', 'aguardando_pecas'].includes(s) ? 'repair' : s === 'concluida' ? 'ready' : s === 'faturada' ? 'delivered' : s === 'cancelada' ? 'cancelled' : 'open')
    const funnelCounts = { open: 0, repair: 0, ready: 0, delivered: 0, cancelled: 0 }
    for (const o of createdOs) funnelCounts[stageOf(String(o.status)) as keyof typeof funnelCounts]++
    const waitingParts = createdOs.filter(o => o.status === 'aguardando_pecas').length
    const timings = {
        toStart: avg(createdOs.map(o => hoursBetween(o.created_at, o.started_at))),
        repair: avg(createdOs.map(o => hoursBetween(o.started_at ?? o.created_at, o.completed_at))),
        toDelivery: avg(createdOs.map(o => hoursBetween(o.completed_at, paidAt.get(String(o.id))))),
        total: avg(createdOs.map(o => hoursBetween(o.created_at, paidAt.get(String(o.id)) ?? null))),
    }

    // Technicians: billed OS in the period (via payments), completed OS, repair time, commission estimate.
    const techs = (techsRes.data ?? []) as Row[]
    const techStats = new Map<string, { revenue: number; billed: Set<string>; completed: number; repairHours: (number | null)[] }>()
    const stat = (id: string) => {
        if (!techStats.has(id)) techStats.set(id, { revenue: 0, billed: new Set(), completed: 0, repairHours: [] })
        return techStats.get(id)!
    }
    for (const p of curPayments) {
        const os = p.service_order_id ? osById.get(String(p.service_order_id)) : null
        if (!os?.technician_id) continue
        const s = stat(String(os.technician_id))
        s.revenue += num(p.amount)
        s.billed.add(String(os.id))
    }
    const { data: completedOs } = await db.from('service_orders')
        .select('technician_id, created_at, started_at, completed_at')
        .eq('company_id', companyId).not('technician_id', 'is', null).gte('completed_at', fromIso).lt('completed_at', toIso).limit(20000)
    for (const o of completedOs ?? []) {
        const s = stat(String(o.technician_id))
        s.completed++
        s.repairHours.push(hoursBetween(o.started_at ?? o.created_at, o.completed_at))
    }
    const technicians = [...techStats.entries()].map(([id, s]) => {
        const t = techs.find(x => x.id === id)
        const rate = num(t?.commission_value)
        const commission = t?.commission_type === 'fixed' ? rate * s.billed.size : (rate / 100) * s.revenue
        return {
            id, name: String(t?.name ?? 'Técnico removido'), completed: s.completed, billed: s.billed.size,
            revenue: s.revenue, ticketAvg: s.billed.size ? s.revenue / s.billed.size : null,
            repairHours: avg(s.repairHours), commission: rate ? commission : null,
        }
    }).sort((a, b) => b.revenue - a.revenue || b.completed - a.completed)

    // Customers: new vs returning in the period, top spenders, and who hasn't come back.
    const buyers = new Map<string, number>()
    for (const p of curPayments) if (p.customer_id) buyers.set(String(p.customer_id), (buyers.get(String(p.customer_id)) ?? 0) + num(p.amount))
    const buyerIds = [...buyers.keys()]
    const returning = new Set<string>()
    for (let i = 0; i < buyerIds.length; i += 300) {
        const chunk = buyerIds.slice(i, i + 300)
        const [olderOs, olderPay] = await Promise.all([
            db.from('service_orders').select('customer_id').eq('company_id', companyId).in('customer_id', chunk).lt('created_at', fromIso).limit(5000),
            db.from('payments').select('customer_id').eq('company_id', companyId).in('customer_id', chunk).lt('payment_date', fromIso).limit(5000),
        ])
        for (const r of [...(olderOs.data ?? []), ...(olderPay.data ?? [])]) returning.add(String(r.customer_id))
    }
    const topIds = [...buyers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Lapsed: last OS more than 180 days ago and nothing since.
    const cutoff = startOf(addDays(today, -180))
    const { data: history } = await db.from('service_orders').select('customer_id, created_at').eq('company_id', companyId).not('customer_id', 'is', null).order('created_at', { ascending: false }).limit(20000)
    const lastVisit = new Map<string, string>()
    const visits = new Map<string, number>()
    for (const h of history ?? []) {
        const id = String(h.customer_id)
        if (!lastVisit.has(id)) lastVisit.set(id, String(h.created_at))
        visits.set(id, (visits.get(id) ?? 0) + 1)
    }
    const lapsedIds = [...lastVisit.entries()].filter(([, at]) => at < cutoff).sort((a, b) => (visits.get(b[0]) ?? 0) - (visits.get(a[0]) ?? 0)).slice(0, 25)
    const lookupIds = [...new Set([...topIds.map(t => t[0]), ...lapsedIds.map(l => l[0])])]
    const names = new Map<string, Row>()
    if (lookupIds.length) {
        const { data } = await db.from('customers').select('id, name, phone').eq('company_id', companyId).in('id', lookupIds)
        for (const c of data ?? []) names.set(c.id as string, c)
    }

    return {
        period,
        previous: prev,
        today,
        granularity: monthly ? 'month' as const : 'day' as const,
        kpis: { current: summarize(cur), previous: summarize(before) },
        dre: {
            revenueOs: cur.revenueOs,
            revenuePdv: cur.revenuePdv,
            costParts: cur.costParts,
            costProducts: cur.costProducts,
            expenses: [...expenseGroups.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
            previous: { revenue: before.revenue, gross: before.revenue - before.costParts - before.costProducts, expenses: before.expenses },
        },
        daily: [...series.entries()].map(([date, v]) => ({ date, os: Math.round(v.os * 100) / 100, pdv: Math.round(v.pdv * 100) / 100 })),
        goal: goalInfo,
        goalValue: goal,
        funnel: { counts: funnelCounts, total: createdOs.length, waitingParts, timings },
        technicians,
        customers: {
            newCount: newCustRes.count ?? 0,
            newCountPrev: prevNewCustRes.count ?? 0,
            buyers: buyerIds.length,
            returning: buyerIds.filter(id => returning.has(id)).length,
            top: topIds.map(([id, amount]) => ({ id, name: String(names.get(id)?.name ?? 'Cliente'), amount })),
            lapsed: lapsedIds.map(([id, at]) => ({ id, name: String(names.get(id)?.name ?? 'Cliente'), phone: (names.get(id)?.phone as string | null) ?? null, lastVisit: at, visits: visits.get(id) ?? 0 })).filter(c => names.has(c.id)),
        },
    }
}

export type Report = Awaited<ReturnType<typeof computeReport>>
