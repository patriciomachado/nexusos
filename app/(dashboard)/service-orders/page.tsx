import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Plus, Wrench } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import SearchInput from '@/components/ui/SearchInput'
import OSStatusBadge from '@/components/os/OSStatusBadge'
import { cn, formatCurrency } from '@/lib/utils'
import { OS_PRIORITY, OS_STATUS, OS_STATUS_ORDER } from '@/lib/os/status'

export const metadata = { title: 'Ordens de serviço · Nexus OS' }

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** Open work first: the default view hides delivered and cancelled orders. */
const ACTIVE = ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas', 'concluida']

function shortDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const sameDay = d.toDateString() === today.toDateString()
    return sameDay
        ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
}

export default async function ServiceOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string }> }) {
    const { userId } = await auth()
    const { status, search } = await searchParams
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id, role').eq('clerk_id', userId!).single()
    const companyId = user?.company_id
    if (user?.role === 'cashier') redirect('/dashboard')

    const filter = status === 'todas' ? 'todas' : status && OS_STATUS[status] ? status : 'ativas'
    const term = (search ?? '').replace(/[,()%*]/g, ' ').trim()

    let query = db
        .from('service_orders')
        .select('id, order_number, title, equipment_description, status, priority, created_at, scheduled_date, estimated_cost, final_cost, customers(name), technicians(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (filter === 'ativas') query = query.in('status', ACTIVE)
    else if (filter !== 'todas') query = query.eq('status', filter)

    if (term) {
        const { data: matches } = await db.from('customers').select('id').eq('company_id', companyId).ilike('name', `%${term}%`).limit(50)
        const ors = [`title.ilike.%${term}%`, `order_number.ilike.%${term}%`, `equipment_description.ilike.%${term}%`, `equipment_serial.ilike.%${term}%`]
        if (matches?.length) ors.push(`customer_id.in.(${matches.map(m => m.id).join(',')})`)
        query = query.or(ors.join(','))
    }

    const [{ data: orders }, { data: statusRows }] = await Promise.all([
        query.limit(100),
        db.from('service_orders').select('status').eq('company_id', companyId).in('status', ACTIVE).limit(5000),
    ])

    const counts: Record<string, number> = {}
    for (const r of statusRows ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1
    const activeCount = (statusRows ?? []).length

    const tabs = [
        { key: 'ativas', label: 'Em aberto', count: activeCount },
        ...OS_STATUS_ORDER.map(s => ({ key: s, label: OS_STATUS[s].short, count: ACTIVE.includes(s) ? counts[s] ?? 0 : undefined })),
        { key: 'todas', label: 'Todas', count: undefined },
    ]
    const href = (key: string) => {
        const p = new URLSearchParams()
        if (key !== 'ativas') p.set('status', key)
        if (search) p.set('search', search)
        const qs = p.toString()
        return qs ? `/service-orders?${qs}` : '/service-orders'
    }
    const list = (orders ?? []) as Row[]

    return (
        <div className="min-h-full bg-background">
            <Header title="Ordens de serviço">
                <div className="flex justify-end">
                    <Link href="/service-orders/new" aria-label="Nova OS" className="h-9 w-9 sm:w-auto sm:pl-3 sm:pr-4 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold inline-flex items-center justify-center gap-1">
                        <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Nova OS</span>
                    </Link>
                </div>
            </Header>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-12 space-y-4">
                <div className="relative">
                    <SearchInput placeholder="Buscar por cliente, aparelho, IMEI ou nº da OS" />
                </div>

                <nav aria-label="Filtrar por situação" className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-2 overflow-x-auto scrollbar-hide">
                    {tabs.map(t => {
                        const on = filter === t.key
                        return (
                            <Link
                                key={t.key}
                                href={href(t.key)}
                                aria-current={on ? 'page' : undefined}
                                className={cn('h-9 px-3.5 rounded-full text-[15px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 transition-colors', on ? 'bg-foreground text-background' : 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]')}
                            >
                                {t.key !== 'ativas' && t.key !== 'todas' && <span className={cn('w-2 h-2 rounded-full', OS_STATUS[t.key].dot)} aria-hidden />}
                                {t.label}
                                {!!t.count && <span className={cn('text-[13px] tabular-nums', on ? 'opacity-70' : 'text-muted-foreground')}>{t.count}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {list.length ? (
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {list.map(o => {
                            const value = Number(o.final_cost) || Number(o.estimated_cost) || 0
                            const pr = OS_PRIORITY[o.priority]
                            return (
                                <li key={o.id}>
                                    <Link href={`/service-orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.02] active:bg-foreground/[0.04]">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-[17px] leading-snug font-medium truncate">
                                                    {[o.title, o.equipment_description].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                            <p className="text-[15px] text-muted-foreground truncate">
                                                {o.customers?.name ?? 'Sem cliente'}
                                                {o.technicians?.name && <> · {o.technicians.name}</>}
                                            </p>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <OSStatusBadge status={o.status} />
                                                {(o.priority === 'alta' || o.priority === 'urgente') && <span className={cn('text-[13px] font-medium', pr?.tone)}>{pr?.label}</span>}
                                                <span className="text-[13px] text-muted-foreground tabular-nums">{o.order_number}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="text-[13px] text-muted-foreground tabular-nums">{shortDate(o.created_at)}</span>
                                            {value > 0 && <span className="text-[15px] tabular-nums">{formatCurrency(value)}</span>}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <div className="rounded-2xl bg-card border border-border/60 px-6 py-14 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-foreground/[0.05] flex items-center justify-center mx-auto">
                            <Wrench className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="mt-4 text-[17px] font-medium">{term ? 'Nada encontrado' : filter === 'ativas' ? 'Nenhuma OS em aberto' : 'Nenhuma OS aqui'}</p>
                        <p className="mt-1 text-[15px] text-muted-foreground">{term ? 'Tente outro nome, modelo ou número.' : 'Quando um aparelho entrar, abra uma OS para acompanhar.'}</p>
                        {!term && (
                            <Link href="/service-orders/new" className="mt-5 h-11 px-5 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center gap-1.5">
                                <Plus className="w-5 h-5" /> Nova OS
                            </Link>
                        )}
                    </div>
                )}
                {list.length === 100 && <p className="text-center text-[13px] text-muted-foreground">Mostrando as 100 mais recentes. Use a busca para achar outras.</p>}
            </div>
        </div>
    )
}
