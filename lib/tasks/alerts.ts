import type { SupabaseClient } from '@supabase/supabase-js'
import type { TaskAlert } from './types'
import { addDays, diffDays, relativeDayLabel } from './dates'

/**
 * Collects what needs attention in the other modules (Akiflow's "universal
 * inbox"). Alerts are computed from live data on every read, so resolving
 * the item in its own module makes the alert disappear by itself.
 *
 * Every query is scoped by company_id and limited; a failing source is
 * skipped instead of breaking the whole list.
 */

const OPEN_OS = ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas']
const STALE_OS_DAYS = 5
const PARTS_WAIT_DAYS = 3
const DEVICE_REVIEW_DAYS = 7
const TRADE_IN_DAYS = 2
const NEGATIVE_RATING_DAYS = 14
const PAYMENT_LOOKAHEAD_DAYS = 3
/** Brazil has no DST since 2019; the shop's day boundaries are UTC-3. */
const TZ_OFFSET = '-03:00'

function brl(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function localDay(iso: string) {
    // Convert a timestamp to the shop's local calendar day (UTC-3).
    const d = new Date(new Date(iso).getTime() - 3 * 3600_000)
    return d.toISOString().slice(0, 10)
}

function localTime(iso: string) {
    const d = new Date(new Date(iso).getTime() - 3 * 3600_000)
    return d.toISOString().slice(11, 16)
}

function daysAgo(iso: string, today: string) {
    return diffDays(localDay(iso), today)
}

type Rel<T> = T | T[] | null
function one<T>(rel: Rel<T>): T | null {
    return Array.isArray(rel) ? rel[0] ?? null : rel
}

async function safe<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
    try {
        return await fn()
    } catch (error) {
        console.error(`[tasks/alerts] ${label} failed:`, error)
        return []
    }
}

export async function collectAlerts(db: SupabaseClient, companyId: string, today: string): Promise<TaskAlert[]> {
    const staleCutoff = new Date(Date.now() - STALE_OS_DAYS * 86_400_000).toISOString()
    const tomorrow = addDays(today, 1)
    const dayAfter = addDays(today, 2)

    const sources = await Promise.all([
        // 1. OS paradas e aguardando peças
        safe('service_orders', async () => {
            const { data, error } = await db
                .from('service_orders')
                .select('id, order_number, title, status, priority, created_at, updated_at, customers(name)')
                .eq('company_id', companyId)
                .in('status', OPEN_OS)
                .lte('updated_at', staleCutoff)
                .order('updated_at', { ascending: true })
                .limit(25)
            if (error) throw error
            return (data || []).map((os): TaskAlert => {
                const idle = daysAgo(os.updated_at || os.created_at, today)
                const customer = one(os.customers as Rel<{ name: string }>)?.name
                const waitingParts = os.status === 'aguardando_pecas'
                return {
                    key: `os:${os.id}`,
                    module: 'service_orders',
                    title: waitingParts ? `OS #${os.order_number} aguardando peças` : `OS #${os.order_number} parada`,
                    detail: `${os.title}${customer ? ` · ${customer}` : ''} · sem movimento há ${idle} dias`,
                    href: `/service-orders/${os.id}`,
                    severity: idle >= 15 || os.priority === 'urgente' ? 'high' : 'medium',
                    date: today,
                    suggestion: waitingParts ? `Cobrar peças da OS #${os.order_number}` : `Dar andamento na OS #${os.order_number}`,
                    dismissible: false,
                }
            })
        }),

        safe('service_orders_parts', async () => {
            const partsCutoff = new Date(Date.now() - PARTS_WAIT_DAYS * 86_400_000).toISOString()
            const { data, error } = await db
                .from('service_orders')
                .select('id, order_number, title, updated_at, customers(name)')
                .eq('company_id', companyId)
                .eq('status', 'aguardando_pecas')
                .lte('updated_at', partsCutoff)
                .gt('updated_at', staleCutoff)
                .limit(15)
            if (error) throw error
            return (data || []).map((os): TaskAlert => ({
                key: `os:${os.id}`,
                module: 'service_orders',
                title: `OS #${os.order_number} aguardando peças`,
                detail: `${os.title} · há ${daysAgo(os.updated_at, today)} dias`,
                href: `/service-orders/${os.id}`,
                severity: 'medium',
                date: today,
                suggestion: `Cobrar peças da OS #${os.order_number}`,
                dismissible: false,
            }))
        }),

        // 2. Agendamentos de hoje e amanhã
        safe('appointments', async () => {
            const { data, error } = await db
                .from('appointments')
                .select('id, title, scheduled_date, status, customers(name)')
                .eq('company_id', companyId)
                .in('status', ['scheduled', 'confirmed', 'rescheduled'])
                .gte('scheduled_date', `${today}T00:00:00${TZ_OFFSET}`)
                .lt('scheduled_date', `${dayAfter}T00:00:00${TZ_OFFSET}`)
                .order('scheduled_date')
                .limit(30)
            if (error) throw error
            return (data || []).map((a): TaskAlert => {
                const day = localDay(a.scheduled_date)
                const customer = one(a.customers as Rel<{ name: string }>)?.name
                return {
                    key: `appt:${a.id}`,
                    module: 'appointments',
                    title: a.title || (customer ? `Atendimento: ${customer}` : 'Agendamento'),
                    detail: `${relativeDayLabel(day, today)} às ${localTime(a.scheduled_date)}${customer && a.title ? ` · ${customer}` : ''}${a.status === 'scheduled' ? ' · não confirmado' : ''}`,
                    href: '/appointments',
                    severity: day === today ? 'high' : 'low',
                    date: day,
                    time: localTime(a.scheduled_date),
                    suggestion: day === today ? `Preparar atendimento ${customer ? `de ${customer}` : ''}`.trim() : `Confirmar agendamento ${customer ? `de ${customer}` : ''}`.trim(),
                    dismissible: false,
                }
            })
        }),

        // 3. Estoque baixo (um alerta agregado)
        safe('inventory', async () => {
            const { data, error } = await db
                .from('inventory_items')
                .select('id, name, quantity_in_stock, minimum_quantity')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gt('minimum_quantity', 0)
                .limit(1000)
            if (error) throw error
            const low = (data || []).filter(i => Number(i.quantity_in_stock) <= Number(i.minimum_quantity))
            if (low.length === 0) return []
            const zero = low.filter(i => Number(i.quantity_in_stock) <= 0).length
            const names = low.slice(0, 3).map(i => i.name).join(', ')
            return [{
                key: `stock:${today}`,
                module: 'inventory',
                title: `${low.length} ${low.length === 1 ? 'produto' : 'produtos'} abaixo do mínimo`,
                detail: `${names}${low.length > 3 ? ` e mais ${low.length - 3}` : ''}${zero ? ` · ${zero} zerado${zero > 1 ? 's' : ''}` : ''}`,
                href: '/inventory?filter=low_stock',
                severity: zero > 0 ? 'high' : 'medium',
                date: today,
                suggestion: 'Fazer pedido de reposição',
                dismissible: false,
            } satisfies TaskAlert]
        }),

        // 4. Recebimentos vencidos e a vencer
        safe('payments', async () => {
            const { data, error } = await db
                .from('payments')
                .select('id, amount, due_date, service_order_id, customer_id, customers(name)')
                .eq('company_id', companyId)
                .eq('payment_status', 'pending')
                .not('due_date', 'is', null)
                .lte('due_date', addDays(today, PAYMENT_LOOKAHEAD_DAYS))
                .order('due_date')
                .limit(30)
            if (error) throw error
            return (data || []).map((p): TaskAlert => {
                const customer = one(p.customers as Rel<{ name: string }>)?.name || 'Cliente'
                const overdue = p.due_date < today
                const days = diffDays(p.due_date, today)
                return {
                    key: `pay:${p.id}`,
                    module: 'payments',
                    title: overdue ? `Recebimento vencido · ${customer}` : `Recebimento ${relativeDayLabel(p.due_date, today).toLowerCase()} · ${customer}`,
                    detail: `${brl(Number(p.amount))}${overdue ? ` · venceu há ${days} ${days === 1 ? 'dia' : 'dias'}` : ''}`,
                    href: p.service_order_id ? `/service-orders/${p.service_order_id}` : p.customer_id ? `/customers/${p.customer_id}` : '/reports',
                    severity: overdue ? 'high' : 'medium',
                    date: overdue ? today : p.due_date,
                    suggestion: overdue ? `Cobrar ${customer} (${brl(Number(p.amount))})` : `Lembrar ${customer} do pagamento`,
                    dismissible: false,
                }
            })
        }),

        // 5. Caixa aberto de um dia anterior
        safe('cash_registers', async () => {
            const { data: users, error: usersError } = await db.from('users').select('id, full_name').eq('company_id', companyId)
            if (usersError) throw usersError
            const ids = (users || []).map(u => u.id)
            if (ids.length === 0) return []
            const { data, error } = await db
                .from('cash_registers')
                .select('id, user_id, opened_at')
                .eq('status', 'open')
                .in('user_id', ids)
                .lt('opened_at', `${today}T00:00:00${TZ_OFFSET}`)
                .limit(10)
            if (error) throw error
            return (data || []).map((c): TaskAlert => {
                const who = users?.find(u => u.id === c.user_id)?.full_name
                return {
                    key: `cash:${c.id}`,
                    module: 'cash',
                    title: 'Caixa aberto desde ' + relativeDayLabel(localDay(c.opened_at), today).toLowerCase(),
                    detail: `${who ? `${who} · ` : ''}aberto há ${daysAgo(c.opened_at, today)} ${daysAgo(c.opened_at, today) === 1 ? 'dia' : 'dias'}`,
                    href: '/cash-register',
                    severity: 'high',
                    date: today,
                    suggestion: 'Fechar o caixa e conferir valores',
                    dismissible: false,
                }
            })
        }),

        // 6. Despesas fixas que vencem hoje ou nos próximos dias
        safe('recurring_expenses', async () => {
            const { data, error } = await db
                .from('recurring_expenses')
                .select('id, description, amount, day_of_month')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .limit(100)
            if (error) throw error
            const alerts: TaskAlert[] = []
            for (let offset = 0; offset <= 2; offset++) {
                const day = addDays(today, offset)
                const dom = +day.slice(8, 10)
                const lastDom = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7), 0)).getUTCDate()
                for (const e of data || []) {
                    const due = Math.min(e.day_of_month, lastDom)
                    if (due !== dom) continue
                    alerts.push({
                        key: `expense:${e.id}:${day.slice(0, 7)}`,
                        module: 'cash',
                        title: `Pagar ${e.description}`,
                        detail: `${brl(Number(e.amount))} · vence ${relativeDayLabel(day, today).toLowerCase()}`,
                        href: '/cash-register',
                        severity: offset === 0 ? 'high' : 'low',
                        date: day,
                        suggestion: `Pagar ${e.description}`,
                        dismissible: true,
                    })
                }
            }
            return alerts
        }),

        // 7. Aparelhos em revisão há muito tempo e trocas sem resposta
        safe('devices', async () => {
            const cutoff = new Date(Date.now() - DEVICE_REVIEW_DAYS * 86_400_000).toISOString()
            const { data, error } = await db
                .from('devices')
                .select('id, brand, model, storage, updated_at')
                .eq('company_id', companyId)
                .eq('status', 'em_revisao')
                .lte('updated_at', cutoff)
                .limit(15)
            if (error) throw error
            return (data || []).map((d): TaskAlert => ({
                key: `device:${d.id}`,
                module: 'devices',
                title: `${d.brand} ${d.model}${d.storage ? ` ${d.storage}` : ''} em revisão`,
                detail: `Há ${daysAgo(d.updated_at, today)} dias sem voltar para a vitrine`,
                href: '/devices',
                severity: 'low',
                date: today,
                suggestion: `Concluir revisão do ${d.model}`,
                dismissible: false,
            }))
        }),

        safe('trade_ins', async () => {
            const cutoff = new Date(Date.now() - TRADE_IN_DAYS * 86_400_000).toISOString()
            const { data, error } = await db
                .from('device_trade_ins')
                .select('id, customer_name, device_model, offered_price, created_at')
                .eq('company_id', companyId)
                .eq('status', 'avaliado')
                .lte('created_at', cutoff)
                .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
                .limit(15)
            if (error) throw error
            return (data || []).map((t): TaskAlert => ({
                key: `tradein:${t.id}`,
                module: 'devices',
                title: `Troca sem resposta · ${t.customer_name}`,
                detail: `${t.device_model} · oferta de ${brl(Number(t.offered_price))} há ${daysAgo(t.created_at, today)} dias`,
                href: '/devices',
                severity: 'low',
                date: today,
                suggestion: `Retomar contato com ${t.customer_name} sobre a troca`,
                dismissible: true,
            }))
        }),

        // 8. Avaliações negativas recentes (pós-venda)
        safe('customer_ratings', async () => {
            const since = new Date(Date.now() - NEGATIVE_RATING_DAYS * 86_400_000).toISOString()
            const { data, error } = await db
                .from('customer_ratings')
                .select('id, rating, comment, created_at, customers(name), service_orders(order_number)')
                .eq('company_id', companyId)
                .lte('rating', 3)
                .gte('created_at', since)
                .order('created_at', { ascending: false })
                .limit(15)
            if (error) throw error
            return (data || []).map((r): TaskAlert => {
                const customer = one(r.customers as Rel<{ name: string }>)?.name || 'Cliente'
                const os = one(r.service_orders as Rel<{ order_number: string }>)?.order_number
                return {
                    key: `rating:${r.id}`,
                    module: 'post_sales',
                    title: `Avaliação ${r.rating}★ de ${customer}`,
                    detail: r.comment ? `“${r.comment.slice(0, 90)}${r.comment.length > 90 ? '…' : ''}”` : `OS #${os ?? '—'} · sem comentário`,
                    href: '/post-sales',
                    severity: r.rating <= 2 ? 'high' : 'medium',
                    date: today,
                    suggestion: `Ligar para ${customer} sobre a avaliação`,
                    dismissible: true,
                }
            })
        }),

        // 9. Aniversariantes de hoje e amanhã
        safe('birthdays', async () => {
            const { data, error } = await db
                .from('customers')
                .select('id, name, phone, birth_date')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .not('birth_date', 'is', null)
                .limit(5000)
            if (error) throw error
            const md = (d: string) => d.slice(5, 10)
            const targets = new Map([[md(today), today], [md(tomorrow), tomorrow]])
            return (data || [])
                .filter(c => c.birth_date && targets.has(md(c.birth_date)))
                .slice(0, 20)
                .map((c): TaskAlert => {
                    const day = targets.get(md(c.birth_date))!
                    return {
                        key: `birthday:${c.id}:${day.slice(0, 4)}`,
                        module: 'customers',
                        title: `Aniversário de ${c.name}`,
                        detail: `${relativeDayLabel(day, today)}${c.phone ? ` · ${c.phone}` : ''}`,
                        href: `/customers/${c.id}`,
                        severity: 'low',
                        date: day,
                        suggestion: `Enviar parabéns para ${c.name}`,
                        dismissible: true,
                    }
                })
        }),
    ])

    // De-duplicate (an OS can appear as stale and waiting for parts).
    const byKey = new Map<string, TaskAlert>()
    for (const alert of sources.flat()) {
        if (!byKey.has(alert.key)) byKey.set(alert.key, alert)
    }
    const order = { high: 0, medium: 1, low: 2 }
    return [...byKey.values()].sort((a, b) =>
        a.date.localeCompare(b.date) || order[a.severity] - order[b.severity] || (a.time ?? '').localeCompare(b.time ?? '')
    )
}

export interface AlertState {
    alert_key: string
    snoozed_until: string | null
    dismissed_at: string | null
}

/** Hides snoozed, dismissed and already-converted alerts. */
export function filterAlerts(alerts: TaskAlert[], states: AlertState[], linkedKeys: Set<string>, today: string) {
    const stateByKey = new Map(states.map(s => [s.alert_key, s]))
    return alerts.filter(alert => {
        if (linkedKeys.has(alert.key)) return false
        const state = stateByKey.get(alert.key)
        if (!state) return true
        if (state.dismissed_at) return false
        if (state.snoozed_until && state.snoozed_until > today) return false
        return true
    })
}
