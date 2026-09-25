'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, ChevronRight, Clock, Loader2, MessageCircle, RefreshCw, Search, UserRound, Wrench } from 'lucide-react'
import Header from '@/components/layout/Header'
import Segmented from '@/components/ui/Segmented'
import Sheet from '@/components/tasks/Sheet'
import { Group, SwitchRow, brl } from '@/components/ui/form'
import AppointmentsCalendar from '@/components/appointments/AppointmentsCalendar'
import PayOSModal from '@/components/os/PayOSModal'
import { cn } from '@/lib/utils'

/**
 * Mesa: the repair board. Orders by stage, how long each one has been
 * standing still, who is working on what, and one tap to move an order on
 * (the customer is told on WhatsApp when it's ready).
 */

export interface BoardOS {
    id: string
    order_number: string
    title: string | null
    equipment: string | null
    status: string
    priority: string | null
    total: number
    technician_id: string | null
    technician: string | null
    customer: { name: string; phone: string | null } | null
    stage_since: string
    created_at: string
}

type Stage = { id: string; label: string; dot: string; warn?: number; late?: number }

const STAGES: Stage[] = [
    { id: 'aberta', label: 'Recebidas', dot: 'bg-blue-500', warn: 1, late: 3 },
    { id: 'agendada', label: 'Agendadas', dot: 'bg-violet-500' },
    { id: 'em_andamento', label: 'Em reparo', dot: 'bg-amber-500', warn: 3, late: 7 },
    { id: 'aguardando_pecas', label: 'Aguardando peça', dot: 'bg-orange-500', warn: 5, late: 10 },
    { id: 'concluida', label: 'Prontas', dot: 'bg-emerald-500', warn: 3, late: 7 },
    { id: 'faturada', label: 'Entregues', dot: 'bg-teal-600' },
]
const stageOf = (id: string) => STAGES.find(s => s.id === id) ?? STAGES[0]

function daysSince(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}
function ageLabel(d: number) {
    if (d <= 0) return 'hoje'
    if (d === 1) return '1 dia'
    return `${d} dias`
}
function level(o: BoardOS): 'ok' | 'warn' | 'late' {
    const s = stageOf(o.status)
    const d = daysSince(o.stage_since)
    if (s.late != null && d >= s.late) return 'late'
    if (s.warn != null && d >= s.warn) return 'warn'
    return 'ok'
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function MesaClient({ orders: initial, technicians, myTechnicianId, appointments, customers, serviceOrders }: {
    orders: BoardOS[]
    technicians: { id: string; name: string }[]
    myTechnicianId: string | null
    appointments: unknown[]
    customers: unknown[]
    serviceOrders: unknown[]
}) {
    const router = useRouter()
    const [view, setView] = useState<'board' | 'agenda'>('board')
    const [orders, setOrders] = useState(initial)
    const [who, setWho] = useState<string>('all')
    const [lateOnly, setLateOnly] = useState(false)
    const [query, setQuery] = useState('')
    const [stage, setStage] = useState('em_andamento')
    const [selected, setSelected] = useState<BoardOS | null>(null)
    const [paying, setPaying] = useState<BoardOS | null>(null)
    const [dragId, setDragId] = useState<string | null>(null)
    const [over, setOver] = useState<string | null>(null)
    const [notify, setNotify] = useState(true)
    const [busy, setBusy] = useState(false)

    const filtered = useMemo(() => {
        const q = normalize(query.trim())
        return orders.filter(o =>
            (who === 'all' || (who === 'none' ? !o.technician_id : o.technician_id === who)) &&
            (!lateOnly || level(o) !== 'ok') &&
            (!q || normalize(`${o.order_number} ${o.title ?? ''} ${o.equipment ?? ''} ${o.customer?.name ?? ''}`).includes(q)))
    }, [orders, who, lateOnly, query])

    const byStage = useMemo(() => {
        const m = new Map<string, BoardOS[]>(STAGES.map(s => [s.id, []]))
        for (const o of filtered) m.get(o.status)?.push(o)
        for (const list of m.values()) list.sort((a, b) => +new Date(a.stage_since) - +new Date(b.stage_since))
        return m
    }, [filtered])

    const activeCount = (id: string) => orders.filter(o => o.technician_id === id && o.status !== 'faturada' && o.status !== 'concluida').length
    const lateCount = orders.filter(o => level(o) === 'late').length
    const warnCount = orders.filter(o => level(o) !== 'ok').length

    const move = async (o: BoardOS, status: string) => {
        if (status === o.status) return
        if (status === 'faturada') { setSelected(null); setPaying(o); return }
        setBusy(true)
        const prev = orders
        setOrders(list => list.map(x => x.id === o.id ? { ...x, status, stage_since: new Date().toISOString() } : x))
        try {
            const res = await fetch(`/api/service-orders/${o.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notify }),
            })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error()
            toast.success(`OS ${o.order_number}: ${stageOf(status).label.toLowerCase()}`)
            if (status === 'concluida' && notify) {
                if (d.notice?.sent) toast.success(`${o.customer?.name?.split(' ')[0] ?? 'Cliente'} avisado no WhatsApp`)
                else if (d.notice?.url) window.open(d.notice.url, '_blank')
                else if (d.notice?.reason === 'no_phone') toast.message('O cliente não tem WhatsApp cadastrado.')
            }
            setSelected(null)
            router.refresh()
        } catch {
            setOrders(prev)
            toast.error('Não foi possível mover a OS')
        } finally {
            setBusy(false)
        }
    }

    const assign = async (o: BoardOS, techId: string) => {
        setBusy(true)
        try {
            const res = await fetch(`/api/service-orders/${o.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ technician_id: techId || null }),
            })
            if (!res.ok) throw new Error()
            const name = technicians.find(t => t.id === techId)?.name ?? null
            setOrders(list => list.map(x => x.id === o.id ? { ...x, technician_id: techId || null, technician: name } : x))
            setSelected(s => s && s.id === o.id ? { ...s, technician_id: techId || null, technician: name } : s)
            toast.success(name ? `Com ${name}` : 'Sem técnico')
        } catch {
            toast.error('Não foi possível trocar o técnico')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="min-h-full bg-background">
            <Header title="Mesa" />
            <div className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-4 pb-10 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <Segmented ariaLabel="Ver" value={view} onChange={setView} options={[{ value: 'board', label: 'Quadro' }, { value: 'agenda', label: 'Agenda' }]} />
                    <button type="button" onClick={() => router.refresh()} aria-label="Atualizar" className="w-10 h-10 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1] flex items-center justify-center">
                        <RefreshCw className="w-[18px] h-[18px]" />
                    </button>
                </div>

                {view === 'agenda' ? (
                    <div className="rounded-2xl bg-card border border-border/60 p-2">
                        <AppointmentsCalendar initialAppointments={appointments as never[]} customers={customers as never[]} technicians={technicians} serviceOrders={serviceOrders as never[]} />
                    </div>
                ) : (
                    <>
                        {/* Who + attention */}
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                            <Pill on={who === 'all'} onClick={() => setWho('all')}>Todas</Pill>
                            {myTechnicianId && <Pill on={who === myTechnicianId} onClick={() => setWho(myTechnicianId)}>Minhas <Count n={activeCount(myTechnicianId)} /></Pill>}
                            {technicians.filter(t => t.id !== myTechnicianId).map(t => (
                                <Pill key={t.id} on={who === t.id} onClick={() => setWho(t.id)}>{t.name.split(' ')[0]} <Count n={activeCount(t.id)} /></Pill>
                            ))}
                            <Pill on={who === 'none'} onClick={() => setWho('none')}>Sem técnico</Pill>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="flex-1 flex items-center gap-2 h-11 px-3 rounded-xl bg-foreground/[0.06]">
                                <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                                <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar OS, aparelho ou cliente" className="flex-1 min-w-0 bg-transparent text-[17px] outline-none" />
                            </label>
                            {warnCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setLateOnly(v => !v)}
                                    className={cn('h-11 px-3 rounded-xl inline-flex items-center gap-1.5 text-[15px] font-medium shrink-0', lateOnly ? 'bg-red-600 text-white' : 'bg-red-500/10 text-red-700 dark:text-red-400')}
                                >
                                    <AlertTriangle className="w-4 h-4" /> {lateCount > 0 ? `${lateCount} atrasada${lateCount > 1 ? 's' : ''}` : `${warnCount} parada${warnCount > 1 ? 's' : ''}`}
                                </button>
                            )}
                        </div>

                        {/* Phones: one stage at a time */}
                        <div className="lg:hidden space-y-3">
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                                {STAGES.map(s => {
                                    const list = byStage.get(s.id) ?? []
                                    const hot = list.some(o => level(o) === 'late')
                                    return (
                                        <button key={s.id} type="button" onClick={() => setStage(s.id)} className={cn('shrink-0 h-9 pl-3 pr-2.5 rounded-full text-[15px] font-medium inline-flex items-center gap-1.5', stage === s.id ? 'bg-foreground text-background' : 'bg-foreground/[0.06]')}>
                                            <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                                            {s.label}
                                            <span className={cn('min-w-[20px] h-5 px-1.5 rounded-full text-[12px] font-semibold inline-flex items-center justify-center', hot ? 'bg-red-600 text-white' : stage === s.id ? 'bg-background/20' : 'bg-foreground/10')}>{list.length}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <CardList orders={byStage.get(stage) ?? []} onOpen={setSelected} empty={`Nenhuma OS em “${stageOf(stage).label}”.`} />
                        </div>

                        {/* Desktop: all columns, drag to move */}
                        <div className="hidden lg:grid grid-cols-6 gap-3 items-start">
                            {STAGES.map(s => {
                                const list = byStage.get(s.id) ?? []
                                return (
                                    <section
                                        key={s.id}
                                        aria-label={s.label}
                                        onDragOver={e => { e.preventDefault(); setOver(s.id) }}
                                        onDragLeave={() => setOver(o => (o === s.id ? null : o))}
                                        onDrop={e => {
                                            e.preventDefault(); setOver(null)
                                            const o = orders.find(x => x.id === dragId)
                                            if (o) move(o, s.id)
                                        }}
                                        className={cn('rounded-2xl bg-foreground/[0.03] p-2 min-h-[60vh] transition-colors', over === s.id && 'bg-primary/10 ring-2 ring-primary/40')}
                                    >
                                        <header className="flex items-center gap-2 px-2 py-1.5">
                                            <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                                            <h2 className="text-[15px] font-semibold flex-1 truncate">{s.label}</h2>
                                            <span className="text-[13px] text-muted-foreground tabular-nums">{list.length}</span>
                                        </header>
                                        <div className="space-y-2">
                                            {list.map(o => (
                                                <div key={o.id} draggable onDragStart={() => setDragId(o.id)} onDragEnd={() => setDragId(null)} className={cn(dragId === o.id && 'opacity-50')}>
                                                    <Card o={o} onOpen={() => setSelected(o)} compact />
                                                </div>
                                            ))}
                                            {!list.length && <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">Vazio</p>}
                                        </div>
                                    </section>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>

            {selected && (
                <Sheet open onClose={() => setSelected(null)} title={`OS ${selected.order_number}`} subtitle={[selected.equipment, selected.title].filter(Boolean).join(' · ') || undefined}>
                    <div className="space-y-5">
                        <div tabIndex={-1} data-autofocus className="outline-none" aria-hidden />
                        <Group>
                            <Row label="Cliente" value={selected.customer?.name ?? '—'} />
                            <Row label="Etapa" value={`${stageOf(selected.status).label} · há ${ageLabel(daysSince(selected.stage_since))}`} tone={level(selected)} />
                            {selected.total > 0 && <Row label="Valor" value={brl(selected.total)} />}
                            <label className="flex items-center justify-between gap-3 px-4 min-h-[48px]">
                                <span className="text-[17px]">Técnico</span>
                                <select
                                    value={selected.technician_id ?? ''}
                                    onChange={e => assign(selected, e.target.value)}
                                    disabled={busy}
                                    className="bg-transparent text-[17px] text-muted-foreground text-right outline-none max-w-[60%]"
                                >
                                    <option value="">Sem técnico</option>
                                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </label>
                        </Group>

                        <div className="space-y-2">
                            <p className="px-1 text-[13px] text-muted-foreground">Mover para</p>
                            <div className="grid grid-cols-2 gap-2">
                                {STAGES.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        disabled={busy || s.id === selected.status}
                                        onClick={() => move(selected, s.id)}
                                        className={cn('h-12 rounded-xl px-3 inline-flex items-center gap-2 text-[15px] font-medium text-left', s.id === selected.status ? 'bg-foreground text-background' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}
                                    >
                                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', s.dot)} />
                                        <span className="truncate">{s.id === 'faturada' ? 'Entregue e pago' : s.label.replace(/s$/, '').replace('Prontas', 'Pronta')}</span>
                                        {busy && s.id !== selected.status && <Loader2 className="w-4 h-4 animate-spin ml-auto opacity-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Group footer="Quando a OS vira “Pronta”, a Alice manda o aviso com o valor pelo WhatsApp da loja.">
                            <SwitchRow label="Avisar cliente quando ficar pronta" checked={notify} onChange={setNotify} />
                        </Group>

                        <div className="flex gap-2">
                            <Link href={`/service-orders/${selected.id}`} className="flex-1 h-12 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center gap-1">Abrir OS <ChevronRight className="w-4 h-4" /></Link>
                            {selected.customer?.phone && (
                                <a
                                    href={`https://wa.me/${waNumber(selected.customer.phone)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-12 px-5 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-[17px] font-medium inline-flex items-center gap-1.5"
                                >
                                    <MessageCircle className="w-5 h-5" /> WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                </Sheet>
            )}

            {paying && (
                <PayOSModal
                    isOpen
                    onClose={() => setPaying(null)}
                    onSuccess={() => {
                        setOrders(list => list.map(x => x.id === paying.id ? { ...x, status: 'faturada', stage_since: new Date().toISOString() } : x))
                        setPaying(null)
                        router.refresh()
                    }}
                    osId={paying.id}
                    osNumber={paying.order_number}
                    amount={paying.total}
                />
            )}
        </div>
    )
}

function waNumber(phone: string) {
    const d = phone.replace(/\D/g, '')
    return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}

function CardList({ orders, onOpen, empty }: { orders: BoardOS[]; onOpen: (o: BoardOS) => void; empty: string }) {
    if (!orders.length) return <p className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-[15px] text-muted-foreground">{empty}</p>
    return (
        <div className="space-y-2">
            {orders.map(o => <Card key={o.id} o={o} onOpen={() => onOpen(o)} />)}
        </div>
    )
}

function Card({ o, onOpen, compact }: { o: BoardOS; onOpen: () => void; compact?: boolean }) {
    const lv = level(o)
    const d = daysSince(o.stage_since)
    const urgent = o.priority === 'urgente' || o.priority === 'alta'
    return (
        <button
            type="button"
            onClick={onOpen}
            className={cn(
                'w-full text-left rounded-2xl bg-card border p-3 transition-colors hover:bg-foreground/[0.02] active:scale-[0.99]',
                lv === 'late' ? 'border-red-500/50' : lv === 'warn' ? 'border-orange-400/50' : 'border-border/60'
            )}
        >
            <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-muted-foreground tabular-nums">{o.order_number}</span>
                {urgent && <span className="text-[11px] font-semibold px-1.5 h-5 inline-flex items-center rounded-full bg-red-500/12 text-red-700 dark:text-red-400">{o.priority === 'urgente' ? 'Urgente' : 'Alta'}</span>}
                <span className={cn(
                    'ml-auto inline-flex items-center gap-1 text-[12px] font-medium',
                    lv === 'late' ? 'text-red-600 dark:text-red-400' : lv === 'warn' ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                )}>
                    <Clock className="w-3.5 h-3.5" /> {ageLabel(d)}
                </span>
            </div>
            <p className={cn('mt-1 font-medium leading-snug', compact ? 'text-[14px] line-clamp-2' : 'text-[16px] truncate')}>{[o.equipment, o.title].filter(Boolean).join(' · ') || 'Sem descrição'}</p>
            <div className="mt-1 flex items-center gap-3 text-[13px] text-muted-foreground min-w-0">
                <span className="inline-flex items-center gap-1 min-w-0"><UserRound className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{o.customer?.name ?? 'Sem cliente'}</span></span>
                {!compact && <span className="inline-flex items-center gap-1 min-w-0"><Wrench className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{o.technician ?? 'Sem técnico'}</span></span>}
                {o.total > 0 && !compact && <span className="ml-auto tabular-nums text-foreground/80">{brl(o.total)}</span>}
            </div>
            {compact && <p className="mt-0.5 text-[12px] text-muted-foreground truncate">{o.technician ?? 'Sem técnico'}</p>}
        </button>
    )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium inline-flex items-center gap-1.5 transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}>
            {children}
        </button>
    )
}

function Count({ n }: { n: number }) {
    return <span className="text-[12px] opacity-70 tabular-nums">{n}</span>
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'late' }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 min-h-[48px]">
            <span className="text-[17px] shrink-0">{label}</span>
            <span className={cn('text-[17px] text-right truncate', tone === 'late' ? 'text-red-600 dark:text-red-400' : tone === 'warn' ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground')}>{value}</span>
        </div>
    )
}
