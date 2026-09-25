import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard'
import SetupAssistant, { type SetupCompany } from '@/components/onboarding/SetupAssistant'
import { needsOnboarding } from '@/lib/onboarding/status'
import TasksTodayWidget from '@/components/tasks/TasksTodayWidget'
import QuickActions from '@/components/dashboard/QuickActions'
import { Amount, PrivacyProvider, PrivacyToggle, PrivateBlock } from '@/components/dashboard/Privacy'
import DailyRevenueChart from '@/components/reports/DailyRevenueChart'
import VizScope from '@/components/reports/VizScope'
import OSStatusBadge from '@/components/os/OSStatusBadge'
import { computeOverview } from '@/lib/reports/overview'
import { dateStringInZone, DEFAULT_TIMEZONE } from '@/lib/tasks/dates'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const OPEN = ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas']

async function getEmployeeData(companyId: string) {
    const db = createAdminClient()
    const { data: recentOS } = await db
        .from('service_orders')
        .select('*, customers(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10)
    return { recentOS }
}

async function getDashboardData(companyId: string) {
    const db = createAdminClient()
    const today = dateStringInZone(DEFAULT_TIMEZONE)
    const startToday = new Date(`${today}T00:00:00-03:00`).toISOString()
    const [overview, openRes, readyRes, openedTodayRes, recentRes, stockRes] = await Promise.all([
        computeOverview(db, companyId),
        db.from('service_orders').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', OPEN),
        db.from('service_orders').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'concluida'),
        db.from('service_orders').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', startToday),
        db.from('service_orders').select('id, order_number, title, equipment_description, status, created_at, customers(name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
        db.from('inventory_items').select('id, name, quantity_in_stock, minimum_quantity').eq('company_id', companyId).eq('is_active', true).limit(500),
    ])
    const lowStock = ((stockRes.data ?? []) as Row[])
        .filter(i => Number(i.minimum_quantity) > 0 && Number(i.quantity_in_stock) <= Number(i.minimum_quantity))
        .sort((a, b) => Number(a.quantity_in_stock) - Number(b.quantity_in_stock))
    return {
        overview,
        os: { open: openRes.count ?? 0, ready: readyRes.count ?? 0, openedToday: openedTodayRes.count ?? 0 },
        recent: (recentRes.data ?? []) as Row[],
        lowStock,
    }
}

/** "+12%" against the comparison period; null when there is no base. */
function change(cur: number, prev: number) {
    if (!prev) return null
    return (cur - prev) / Math.abs(prev)
}

function Delta({ value, label }: { value: number | null; label: string }) {
    if (value == null) return <span className="text-[13px] text-muted-foreground">{label}</span>
    const up = value >= 0
    return (
        <span className={cn('text-[13px] font-medium', up ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {up ? '▲' : '▼'} {Math.abs(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% <span className="font-normal text-muted-foreground">{label}</span>
        </span>
    )
}

function Tile({ label, children, footer }: { label: string; children: React.ReactNode; footer?: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 p-4 min-w-0">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-[24px] leading-tight font-semibold tracking-tight truncate">{children}</p>
            {footer && <div className="mt-1">{footer}</div>}
        </div>
    )
}

function shortWhen(iso: string) {
    const d = new Date(iso)
    const same = dateStringInZone(DEFAULT_TIMEZONE, d) === dateStringInZone(DEFAULT_TIMEZONE)
    return same
        ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: DEFAULT_TIMEZONE })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: DEFAULT_TIMEZONE })
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ configurar?: string }> }) {
    const { configurar } = await searchParams
    const { userId } = await auth()
    if (!userId) return null

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, role, company_id, full_name, companies(name)').eq('clerk_id', userId).single()
    const companyId = user?.company_id

    if (!companyId) return null

    // Verificar role ANTES de carregar dados pesados
    if (user.role !== 'admin' && user.role !== 'owner') {
        const { recentOS } = await getEmployeeData(companyId)
        return <EmployeeDashboard role={user.role} recentOS={recentOS || []} />
    }

    const [data, { data: company }] = await Promise.all([
        getDashboardData(companyId),
        db.from('companies').select('id, name, phone, cnpj, logo_url, zip_code, address, city, state, warranty_terms, google_review_url, settings').eq('id', companyId).single(),
    ])
    // ?configurar=1 reopens the setup assistant on purpose (link in Ajustes).
    const showSetup = company ? (configurar === '1' || await needsOnboarding(db, company)) : false

    const firstName = (user.full_name ?? '').split(' ')[0] || ''
    const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: DEFAULT_TIMEZONE }))
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
    const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: DEFAULT_TIMEZONE })
    const { overview: ov, os } = data
    const t = ov.today
    const m = ov.month

    return (
        <div className="min-h-full bg-background text-foreground">
            <Header title="Início" />
            <PrivacyProvider>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:items-start">
                    {/* ── Above the fold on a phone: today, shortcuts, tasks ── */}
                    <div className="space-y-4 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h1 className="text-[22px] leading-tight font-semibold tracking-tight truncate">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
                                <p className="text-[13px] text-muted-foreground first-letter:uppercase">{dateLabel}</p>
                            </div>
                            <PrivacyToggle />
                        </div>

                        {/* Hoje */}
                        <section aria-labelledby="today-title" className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                            <div className="p-4 pb-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h2 id="today-title" className="text-[15px] font-medium text-muted-foreground">Ganhos de hoje</h2>
                                    <Link href="/cash-register" className="text-[15px] text-primary inline-flex items-center">Caixa <ChevronRight className="w-4 h-4" /></Link>
                                </div>
                                <p className="mt-0.5 text-[36px] leading-tight font-semibold tracking-tight"><Amount value={t.revenue} /></p>
                                <p className="text-[15px] text-muted-foreground">
                                    Líquido <Amount value={t.net} plain className="text-foreground font-medium" />
                                    <span> · {t.tickets} {t.tickets === 1 ? 'atendimento pago' : 'atendimentos pagos'}</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-3 border-t border-border/60 divide-x divide-border/60">
                                {[
                                    { label: 'Em aberto', value: os.open, href: '/service-orders' },
                                    { label: 'Prontas', value: os.ready, href: '/service-orders?status=concluida' },
                                    { label: 'Novas hoje', value: os.openedToday, href: '/service-orders?status=todas' },
                                ].map(s => (
                                    <Link key={s.label} href={s.href} className="px-3 py-2.5 text-center hover:bg-foreground/[0.02]">
                                        <span className="block text-[20px] font-semibold tabular-nums leading-tight">{s.value}</span>
                                        <span className="block text-[12px] text-muted-foreground">OS {s.label.toLowerCase()}</span>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <QuickActions />

                        <div className="lg:hidden">
                            <TasksTodayWidget limit={4} />
                        </div>

                        {/* ── Below the fold ── */}
                        <section aria-labelledby="month-title" className="space-y-2 pt-2">
                            <div className="flex items-end justify-between px-1">
                                <h2 id="month-title" className="text-[20px] font-semibold tracking-tight">Este mês</h2>
                                <Link href="/reports" className="text-[15px] text-primary inline-flex items-center">Relatórios <ChevronRight className="w-4 h-4" /></Link>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Tile label="Faturamento" footer={<Delta value={change(m.revenue, ov.monthPrev.revenue)} label="vs anterior" />}><Amount value={m.revenue} /></Tile>
                                <Tile label="Lucro líquido" footer={<span className="text-[13px] text-muted-foreground">{m.margin == null ? 'sem faturamento' : `margem de ${(m.margin * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}</span>}><Amount value={m.net} /></Tile>
                                <Tile label="Ticket médio" footer={<Delta value={m.ticketAvg != null && ov.monthPrev.ticketAvg ? change(m.ticketAvg, ov.monthPrev.ticketAvg) : null} label="vs anterior" />}>{m.ticketAvg == null ? '—' : <Amount value={m.ticketAvg} />}</Tile>
                                <Tile label="Atendimentos pagos" footer={<span className="text-[13px] text-muted-foreground">{m.osPaid} OS · {m.sales} vendas</span>}>{m.tickets}</Tile>
                            </div>
                        </section>

                        <VizScope>
                            <PrivateBlock label="Faturamento oculto">
                                <DailyRevenueChart data={ov.daily} granularity="day" />
                            </PrivateBlock>
                        </VizScope>
                    </div>

                    {/* ── Side column (desktop) / continues below on phones ── */}
                    <div className="space-y-4 mt-4 lg:mt-0 min-w-0">
                        <div className="hidden lg:block">
                            <TasksTodayWidget limit={6} />
                        </div>

                        <section aria-labelledby="recent-title" className="space-y-2">
                            <div className="flex items-end justify-between px-1">
                                <h2 id="recent-title" className="text-[20px] font-semibold tracking-tight">OS recentes</h2>
                                <Link href="/service-orders" className="text-[15px] text-primary inline-flex items-center">Ver todas <ChevronRight className="w-4 h-4" /></Link>
                            </div>
                            <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                                {data.recent.length ? data.recent.map(o => (
                                    <li key={o.id}>
                                        <Link href={`/service-orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.02]">
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[15px] font-medium truncate">{[o.title, o.equipment_description].filter(Boolean).join(' · ')}</span>
                                                <span className="block text-[13px] text-muted-foreground truncate">{o.customers?.name ?? 'Sem cliente'} · {o.order_number}</span>
                                            </span>
                                            <span className="flex flex-col items-end gap-1 shrink-0">
                                                <OSStatusBadge status={o.status} />
                                                <span className="text-[12px] text-muted-foreground tabular-nums">{shortWhen(o.created_at)}</span>
                                            </span>
                                        </Link>
                                    </li>
                                )) : (
                                    <li className="px-4 py-6 text-center text-[15px] text-muted-foreground">Nenhuma OS ainda. <Link href="/service-orders/new" className="text-primary">Abrir a primeira</Link></li>
                                )}
                            </ul>
                        </section>

                        {data.lowStock.length > 0 && (
                            <section aria-labelledby="stock-title" className="space-y-2">
                                <div className="flex items-end justify-between px-1">
                                    <h2 id="stock-title" className="text-[20px] font-semibold tracking-tight">Estoque baixo</h2>
                                    <Link href="/inventory" className="text-[15px] text-primary inline-flex items-center">Estoque <ChevronRight className="w-4 h-4" /></Link>
                                </div>
                                <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                                    {data.lowStock.slice(0, 5).map(i => (
                                        <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                                            <AlertTriangle className={cn('w-[18px] h-[18px] shrink-0', Number(i.quantity_in_stock) <= 0 ? 'text-red-500' : 'text-orange-500')} />
                                            <span className="flex-1 min-w-0 text-[15px] truncate">{i.name}</span>
                                            <span className="text-[13px] text-muted-foreground tabular-nums shrink-0">{Number(i.quantity_in_stock)} de mín. {Number(i.minimum_quantity)}</span>
                                        </li>
                                    ))}
                                </ul>
                                {data.lowStock.length > 5 && <p className="px-4 text-[13px] text-muted-foreground">e mais {data.lowStock.length - 5} itens</p>}
                            </section>
                        )}
                    </div>
                </div>
            </PrivacyProvider>
            {showSetup && company && <SetupAssistant company={company as SetupCompany} />}
        </div>
    )
}
