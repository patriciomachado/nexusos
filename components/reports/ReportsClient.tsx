'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Check, Loader2, MessageCircle, Pencil, Target } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Segmented from '@/components/ui/Segmented'
import { addDays, localDateString } from '@/lib/tasks/dates'
import type { Report } from '@/lib/reports/compute'
import DailyRevenueChart from './DailyRevenueChart'
import { brl, change, dayLabel, duration, pct } from './format'

type Preset = 'hoje' | '7d' | 'mes' | 'mes-anterior' | 'ano' | 'custom'

function presetRange(p: Preset, today: string): { from: string; to: string } | null {
    const monthStart = `${today.slice(0, 7)}-01`
    switch (p) {
        case 'hoje': return { from: today, to: today }
        case '7d': return { from: addDays(today, -6), to: today }
        case 'mes': return { from: monthStart, to: today }
        case 'mes-anterior': {
            const lastDay = addDays(monthStart, -1)
            return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay }
        }
        case 'ano': return { from: `${today.slice(0, 4)}-01-01`, to: today }
        default: return null
    }
}

export default function ReportsClient({ canEditGoal }: { canEditGoal: boolean }) {
    const today = useMemo(() => localDateString(), [])
    const [preset, setPreset] = useState<Preset>('mes')
    const [range, setRange] = useState(() => presetRange('mes', localDateString())!)
    const [report, setReport] = useState<Report | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const request = useRef(0)

    const load = useCallback(async (r: { from: string; to: string }) => {
        const id = ++request.current
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/reports?from=${r.from}&to=${r.to}`, { cache: 'no-store' })
            const data = await res.json()
            if (id !== request.current) return
            if (!res.ok) throw new Error(data.error ?? 'Não foi possível gerar o relatório.')
            setReport(data)
        } catch (e) {
            if (id === request.current) setError((e as Error).message)
        } finally {
            if (id === request.current) setLoading(false)
        }
    }, [])

    useEffect(() => {
        load(range)
    }, [range, load])

    const choose = (p: Preset) => {
        setPreset(p)
        const r = presetRange(p, today)
        if (r) setRange(r)
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 max-w-7xl mx-auto space-y-5">
            {/* Filters: one row above everything they scope */}
            <div className="flex flex-wrap items-center gap-3">
                <Segmented<Preset>
                    value={preset}
                    onChange={choose}
                    ariaLabel="Período"
                    options={[
                        { value: 'hoje', label: 'Hoje' },
                        { value: '7d', label: '7 dias' },
                        { value: 'mes', label: 'Este mês' },
                        { value: 'mes-anterior', label: 'Mês passado' },
                        { value: 'ano', label: 'Este ano' },
                        { value: 'custom', label: 'Período' },
                    ]}
                />
                {preset === 'custom' && (
                    <div className="flex items-center gap-2 text-[14px]">
                        <input type="date" value={range.from} max={range.to} onChange={e => e.target.value && setRange(r => ({ ...r, from: e.target.value }))} aria-label="De" className="h-9 px-2 rounded-lg bg-foreground/[0.05] focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        <span className="text-muted-foreground">até</span>
                        <input type="date" value={range.to} min={range.from} max={today} onChange={e => e.target.value && setRange(r => ({ ...r, to: e.target.value }))} aria-label="Até" className="h-9 px-2 rounded-lg bg-foreground/[0.05] focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                )}
                {report && (
                    <p className="text-[13px] text-muted-foreground">
                        {report.period.from === report.period.to ? dayLabel(report.period.from) : `${dayLabel(report.period.from)} a ${dayLabel(report.period.to)}`} · comparado a {dayLabel(report.previous.from)}–{dayLabel(report.previous.to)}
                    </p>
                )}
                {loading && report && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            {error && <p role="alert" className="rounded-xl bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 text-[14px]">{error}</p>}

            {!report ? (
                loading && <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
                // Refetch keeps the frame: previous numbers stay, dimmed.
                <div className={cn('space-y-5 transition-opacity', loading && 'opacity-60')}>
                    <Kpis report={report} />
                    <Goal report={report} canEdit={canEditGoal} onSaved={() => load(range)} />
                    <DailyRevenueChart data={report.daily} granularity={report.granularity} />
                    <div className="grid lg:grid-cols-2 gap-5 items-start">
                        <Dre report={report} />
                        <Funnel report={report} />
                    </div>
                    <Technicians report={report} />
                    <Customers report={report} />
                </div>
            )}
        </div>
    )
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

function Delta({ cur, prev, upIsGood = true }: { cur: number | null; prev: number | null; upIsGood?: boolean }) {
    const c = change(cur, prev)
    if (c == null) return <span className="text-[13px] text-muted-foreground">sem base para comparar</span>
    if (Math.abs(c) < 0.005) return <span className="text-[13px] text-muted-foreground">= igual ao período anterior</span>
    const up = c > 0
    const good = up === upIsGood
    const Icon = up ? ArrowUpRight : ArrowDownRight
    return (
        <span className="viz text-[13px] inline-flex items-center gap-0.5" style={{ color: good ? 'var(--viz-good)' : 'var(--viz-bad)' }}>
            <Icon className="w-3.5 h-3.5" />
            <span className="font-semibold">{pct(Math.abs(c))}</span>
            <span className="text-muted-foreground ml-1">vs anterior</span>
        </span>
    )
}

function Tile({ label, value, hint, children }: { label: string; value: string; hint?: string; children?: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-1 min-w-0">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p className="text-[26px] leading-tight font-semibold tracking-tight truncate">{value}</p>
            {hint && <p className="text-[13px] text-muted-foreground truncate">{hint}</p>}
            {children}
        </div>
    )
}

function Kpis({ report }: { report: Report }) {
    const { current: c, previous: p } = report.kpis
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Faturamento" value={brl(c.revenue)}><Delta cur={c.revenue} prev={p.revenue} /></Tile>
            <Tile label="Lucro líquido" value={brl(c.net)} hint={c.margin == null ? undefined : `Margem de ${pct(c.margin, 1)}`}><Delta cur={c.net} prev={p.net} /></Tile>
            <Tile label="Ticket médio" value={c.ticketAvg == null ? '—' : brl(c.ticketAvg)}><Delta cur={c.ticketAvg} prev={p.ticketAvg} /></Tile>
            <Tile label="Atendimentos pagos" value={String(c.tickets)} hint={`${c.osPaid} OS · ${c.sales} vendas`}><Delta cur={c.tickets} prev={p.tickets} /></Tile>
        </div>
    )
}

// ─── Goal ────────────────────────────────────────────────────────────────────

function Goal({ report, canEdit, onSaved }: { report: Report; canEdit: boolean; onSaved: () => void }) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(report.goalValue ? String(report.goalValue) : '')
    const [saving, setSaving] = useState(false)
    const isCurrentMonth = report.period.from === `${report.today.slice(0, 7)}-01`

    if (!isCurrentMonth) return null
    if (!report.goal && !canEdit) return null

    const save = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revenue_goal: value ? Number(value) : null }) })
            if (!res.ok) throw new Error()
            toast.success('Meta salva')
            setEditing(false)
            onSaved()
        } catch {
            toast.error('Não foi possível salvar a meta.')
        } finally {
            setSaving(false)
        }
    }

    const editor = (
        <form onSubmit={e => { e.preventDefault(); save() }} className="flex items-center gap-2">
            <span className="text-[14px] text-muted-foreground">R$</span>
            <input autoFocus inputMode="numeric" value={value} onChange={e => setValue(e.target.value.replace(/\D/g, ''))} placeholder="Ex.: 50000" aria-label="Meta de faturamento do mês" className="w-32 h-9 px-3 rounded-lg bg-foreground/[0.05] text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <button type="submit" disabled={saving} className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-9 px-2 text-[14px] text-muted-foreground">Cancelar</button>
        </form>
    )

    if (!report.goal) {
        return (
            <div className="rounded-2xl bg-card border border-dashed border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px] text-muted-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Defina uma meta de faturamento para acompanhar o mês.</p>
                {editing ? editor : <button type="button" onClick={() => setEditing(true)} className="text-[14px] font-semibold text-primary">Definir meta</button>}
            </div>
        )
    }

    const { goal, progress, projection } = report.goal
    const onTrack = projection >= goal
    return (
        <section className="viz rounded-2xl bg-card border border-border/60 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="type-headline flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Meta do mês</h2>
                {editing ? editor : canEdit && <button type="button" onClick={() => setEditing(true)} className="text-[13px] text-primary inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Alterar</button>}
            </div>
            <div className="flex items-end justify-between gap-3">
                <p className="text-[15px]"><span className="text-[22px] font-semibold">{pct(progress)}</span> <span className="text-muted-foreground">de {brl(goal)}</span></p>
                <p className="text-[13px] text-right" style={{ color: onTrack ? 'var(--viz-good)' : 'var(--viz-bad)' }}>
                    {onTrack ? '✓ No ritmo' : '! Abaixo do ritmo'}<span className="text-muted-foreground"> · projeção {brl(projection)}</span>
                </p>
            </div>
            {/* Meter: fill and track from the same hue */}
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in oklab, var(--viz-s1) 18%, transparent)' }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progresso da meta">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress * 100)}%`, background: 'var(--viz-s1)' }} />
            </div>
        </section>
    )
}

// ─── DRE ─────────────────────────────────────────────────────────────────────

interface LineProps { label: string; value: number; revenue: number; strong?: boolean; sub?: boolean; negative?: boolean }

function DreLine({ label, value, revenue, strong, sub, negative }: LineProps) {
    return (
        <tr className={cn(strong && 'font-semibold', !sub && 'border-t border-border/60')}>
            <td className={cn('py-2', sub && 'pl-4 text-muted-foreground py-1')}>{label}</td>
            <td className={cn('text-right tabular-nums', sub && 'text-muted-foreground')}>{negative && value > 0 ? '− ' : ''}{brl(value)}</td>
            <td className="text-right tabular-nums text-muted-foreground text-[12px] w-16">{revenue ? pct(value / revenue, 1) : '—'}</td>
        </tr>
    )
}

function Dre({ report }: { report: Report }) {
    const d = report.dre
    const revenue = d.revenueOs + d.revenuePdv
    const gross = revenue - d.costParts - d.costProducts
    const expenses = d.expenses.reduce((s, e) => s + e.amount, 0)
    const net = gross - expenses
    const share = (v: number) => (revenue ? pct(v / revenue, 1) : '—')
    return (
        <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
            <h2 className="type-headline">Resultado do período (DRE)</h2>
            <p className="text-[13px] text-muted-foreground mb-2">Quanto entrou, quanto custou e quanto sobrou.</p>
            <table className="w-full text-[14px]">
                <tbody>
                    <DreLine revenue={revenue} label="Faturamento" value={revenue} strong />
                    <DreLine revenue={revenue} label="Ordens de serviço" value={d.revenueOs} sub />
                    <DreLine revenue={revenue} label="Vendas PDV" value={d.revenuePdv} sub />
                    <DreLine revenue={revenue} label="Custo das vendas" value={d.costParts + d.costProducts} negative />
                    <DreLine revenue={revenue} label="Peças usadas nas OS" value={d.costParts} sub />
                    <DreLine revenue={revenue} label="Produtos vendidos" value={d.costProducts} sub />
                    <DreLine revenue={revenue} label="Lucro bruto" value={gross} strong />
                    <DreLine revenue={revenue} label="Despesas" value={expenses} negative />
                    {d.expenses.map(e => <DreLine revenue={revenue} key={e.label} label={e.label} value={e.amount} sub />)}
                    <tr className="border-t-2 border-foreground/20 font-semibold text-[15px]">
                        <td className="py-2.5">Lucro líquido</td>
                        <td className="text-right tabular-nums viz" style={{ color: net < 0 ? 'var(--viz-bad)' : undefined }}>{brl(net)}</td>
                        <td className="text-right tabular-nums text-muted-foreground text-[12px]">{share(net)}</td>
                    </tr>
                </tbody>
            </table>
            <p className="text-[12px] text-muted-foreground mt-2">Despesas são saídas do caixa (contas fixas, despesas avulsas). Sangrias não entram, pois são retiradas de dinheiro.</p>
        </section>
    )
}

// ─── Funnel ──────────────────────────────────────────────────────────────────

function Funnel({ report }: { report: Report }) {
    const f = report.funnel
    const stages = [
        { key: 'open', label: 'Abertas', hint: 'aguardando início' },
        { key: 'repair', label: 'Em reparo', hint: f.waitingParts ? `${f.waitingParts} aguardando peças` : 'na bancada' },
        { key: 'ready', label: 'Prontas', hint: 'aguardando retirada' },
        { key: 'delivered', label: 'Entregues', hint: 'pagas' },
    ] as const
    const max = Math.max(1, ...stages.map(s => f.counts[s.key]))
    return (
        <section className="viz rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
            <h2 className="type-headline">Ordens de serviço abertas no período</h2>
            <p className="text-[13px] text-muted-foreground mb-3">{f.total} OS · onde estão agora{f.counts.cancelled ? ` · ${f.counts.cancelled} canceladas` : ''}</p>
            <ul className="space-y-2.5">
                {stages.map(s => {
                    const v = f.counts[s.key]
                    return (
                        <li key={s.key} className="grid grid-cols-[92px_1fr_40px] items-center gap-3">
                            <div>
                                <p className="text-[14px] font-medium leading-tight">{s.label}</p>
                                <p className="text-[11px] text-muted-foreground leading-tight">{s.hint}</p>
                            </div>
                            <div className="h-6 flex items-center" title={`${s.label}: ${v}`}>
                                <div className="h-5 rounded-r-[4px]" style={{ width: v ? `${Math.max(2, (v / max) * 100)}%` : '0', background: 'var(--viz-s1)' }} />
                            </div>
                            <p className="text-[15px] font-semibold text-right tabular-nums">{v}</p>
                        </li>
                    )
                })}
            </ul>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60 text-center">
                <div><p className="text-[12px] text-muted-foreground">Até começar</p><p className="text-[15px] font-semibold">{duration(f.timings.toStart)}</p></div>
                <div><p className="text-[12px] text-muted-foreground">Reparo</p><p className="text-[15px] font-semibold">{duration(f.timings.repair)}</p></div>
                <div><p className="text-[12px] text-muted-foreground">Pronta → entrega</p><p className="text-[15px] font-semibold">{duration(f.timings.toDelivery)}</p></div>
            </div>
            <p className="text-[12px] text-muted-foreground mt-2 text-center">Tempo médio da abertura à entrega: <b className="text-foreground">{duration(f.timings.total)}</b></p>
        </section>
    )
}

// ─── Technicians ─────────────────────────────────────────────────────────────

function Technicians({ report }: { report: Report }) {
    const rows = report.technicians
    return (
        <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
            <h2 className="type-headline">Desempenho dos técnicos</h2>
            <p className="text-[13px] text-muted-foreground mb-3">OS concluídas e faturamento das OS pagas no período.</p>
            {rows.length === 0 ? (
                <p className="text-[14px] text-muted-foreground py-4 text-center">Nenhuma OS com técnico concluída ou paga no período.</p>
            ) : (
                <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-[14px] min-w-[560px]">
                        <thead className="text-[12px] text-muted-foreground">
                            <tr>
                                <th className="text-left font-medium py-1.5 px-1">Técnico</th>
                                <th className="text-right font-medium px-1">Concluídas</th>
                                <th className="text-right font-medium px-1">Faturamento</th>
                                <th className="text-right font-medium px-1">Ticket médio</th>
                                <th className="text-right font-medium px-1">Tempo de reparo</th>
                                <th className="text-right font-medium px-1">Comissão est.</th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {rows.map((t, i) => (
                                <tr key={t.id} className="border-t border-border/50">
                                    <td className="py-2 px-1 font-medium">{i === 0 && t.revenue > 0 ? '🏆 ' : ''}{t.name}</td>
                                    <td className="text-right px-1">{t.completed}</td>
                                    <td className="text-right px-1 font-medium">{brl(t.revenue)}</td>
                                    <td className="text-right px-1">{t.ticketAvg == null ? '—' : brl(t.ticketAvg)}</td>
                                    <td className="text-right px-1">{duration(t.repairHours)}</td>
                                    <td className="text-right px-1">{t.commission == null ? '—' : brl(t.commission)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

// ─── Customers ───────────────────────────────────────────────────────────────

function whatsappLink(phone: string | null, name: string) {
    let d = (phone ?? '').replace(/\D/g, '')
    if (d.length < 10) return null
    if (!d.startsWith('55')) d = `55${d}`
    const first = name.split(' ')[0]
    return `https://wa.me/${d}?text=${encodeURIComponent(`Olá ${first}! Tudo bem? Aqui é da assistência técnica. Faz um tempo que não nos vemos — precisando de algo para o seu aparelho, estamos à disposição!`)}`
}

function Customers({ report }: { report: Report }) {
    const c = report.customers
    const returningShare = c.buyers ? c.returning / c.buyers : null
    return (
        <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5 space-y-4">
            <div>
                <h2 className="type-headline">Clientes</h2>
                <p className="text-[13px] text-muted-foreground">Quem comprou no período e quem não volta há mais de 6 meses.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-foreground/[0.03] p-3">
                    <p className="text-[12px] text-muted-foreground">Novos cadastros</p>
                    <p className="text-[22px] font-semibold">{c.newCount}</p>
                    <Delta cur={c.newCount} prev={c.newCountPrev} />
                </div>
                <div className="rounded-xl bg-foreground/[0.03] p-3">
                    <p className="text-[12px] text-muted-foreground">Compraram</p>
                    <p className="text-[22px] font-semibold">{c.buyers}</p>
                    <p className="text-[12px] text-muted-foreground">clientes identificados</p>
                </div>
                <div className="rounded-xl bg-foreground/[0.03] p-3">
                    <p className="text-[12px] text-muted-foreground">Já eram clientes</p>
                    <p className="text-[22px] font-semibold">{pct(returningShare)}</p>
                    <p className="text-[12px] text-muted-foreground">{c.returning} voltaram</p>
                </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-5">
                <div>
                    <p className="text-[14px] font-semibold mb-1.5">Quem mais comprou</p>
                    {c.top.length === 0 ? <p className="text-[13px] text-muted-foreground">Sem compras identificadas no período.</p> : (
                        <ol className="divide-y divide-border/50">
                            {c.top.map((t, i) => (
                                <li key={t.id} className="flex items-center justify-between py-2 text-[14px]">
                                    <Link href={`/customers/${t.id}`} className="truncate hover:text-primary"><span className="text-muted-foreground tabular-nums mr-2">{i + 1}.</span>{t.name}</Link>
                                    <span className="font-medium tabular-nums">{brl(t.amount)}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
                <div>
                    <p className="text-[14px] font-semibold mb-1.5">Não voltam há mais de 6 meses</p>
                    {c.lapsed.length === 0 ? <p className="text-[13px] text-muted-foreground">Nenhum cliente afastado. 👏</p> : (
                        <ul className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
                            {c.lapsed.map(l => {
                                const wa = whatsappLink(l.phone, l.name)
                                return (
                                    <li key={l.id} className="flex items-center gap-3 py-2 text-[14px]">
                                        <div className="min-w-0 flex-1">
                                            <Link href={`/customers/${l.id}`} className="block truncate hover:text-primary">{l.name}</Link>
                                            <p className="text-[12px] text-muted-foreground">última OS em {new Date(l.lastVisit).toLocaleDateString('pt-BR')} · {l.visits} {l.visits === 1 ? 'visita' : 'visitas'}</p>
                                        </div>
                                        {wa && (
                                            <a href={wa} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-full bg-green-500/12 text-green-700 dark:text-green-400 text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0">
                                                <MessageCircle className="w-3.5 h-3.5" /> Chamar
                                            </a>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    )
}
