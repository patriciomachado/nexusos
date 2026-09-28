'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock, ExternalLink, MessageCircle, Plus, Search, Trash2, UserRound } from 'lucide-react'
import Header from '@/components/layout/Header'
import Sheet from '@/components/tasks/Sheet'
import { Group, Field, TextInput, TextArea, SelectRow, brl, moneyText, parseMoney } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { FUNNEL_STAGES, STAGE_LABELS, STAGE_DOTS, SOURCE_LABELS, type FunnelStage, type FunnelSource } from '@/lib/funnel/stages'

export interface FunnelEntry {
    id: string
    title: string
    stage: FunnelStage
    value_estimate: number
    source: FunnelSource
    notes: string | null
    lost_reason: string | null
    quote_id: string | null
    service_order_id: string | null
    sale_id: string | null
    stage_changed_at: string
    created_at: string
    customer_id: string | null
    lead_name: string | null
    lead_phone: string | null
    assigned_to: string | null
    customer: { name: string; phone: string | null } | null
    assignee_name: string | null
}

interface CustomerOption { id: string; name: string; phone: string | null }

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function daysSince(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}
function ageLabel(d: number) {
    if (d <= 0) return 'hoje'
    if (d === 1) return '1 dia'
    return `${d} dias`
}
function nameOf(e: FunnelEntry) {
    return e.customer?.name ?? e.lead_name ?? 'Sem nome'
}
function phoneOf(e: FunnelEntry) {
    return e.customer?.phone ?? e.lead_phone ?? null
}
function waNumber(phone: string) {
    const d = phone.replace(/\D/g, '')
    return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}

export default function FunilClient({ entries: initial, customers }: { entries: FunnelEntry[]; customers: CustomerOption[] }) {
    const router = useRouter()
    const [entries, setEntries] = useState(initial)
    const [query, setQuery] = useState('')
    const [stage, setStage] = useState<FunnelStage>('lead')
    const [selected, setSelected] = useState<FunnelEntry | null>(null)
    const [creating, setCreating] = useState(false)
    const [dragId, setDragId] = useState<string | null>(null)
    const [over, setOver] = useState<FunnelStage | null>(null)
    const [busy, setBusy] = useState(false)
    const [losing, setLosing] = useState(false)
    const [lostReason, setLostReason] = useState('')
    const [notesDraft, setNotesDraft] = useState('')
    const [valueDraft, setValueDraft] = useState('')

    const filtered = useMemo(() => {
        const q = normalize(query.trim())
        if (!q) return entries
        return entries.filter(e => normalize(`${e.title} ${nameOf(e)}`).includes(q))
    }, [entries, query])

    const byStage = useMemo(() => {
        const m = new Map<FunnelStage, FunnelEntry[]>(FUNNEL_STAGES.map(s => [s, []]))
        for (const e of filtered) m.get(e.stage)?.push(e)
        for (const list of m.values()) list.sort((a, b) => +new Date(b.stage_changed_at) - +new Date(a.stage_changed_at))
        return m
    }, [filtered])

    const totalOpen = entries.filter(e => e.stage !== 'fechado' && e.stage !== 'perdido').reduce((s, e) => s + e.value_estimate, 0)
    const closedCount = entries.filter(e => e.stage === 'fechado').length
    const lostCount = entries.filter(e => e.stage === 'perdido').length
    const convRate = closedCount + lostCount > 0 ? Math.round((closedCount / (closedCount + lostCount)) * 100) : null

    const openDetail = (e: FunnelEntry) => {
        setSelected(e)
        setLosing(false)
        setLostReason('')
        setNotesDraft(e.notes ?? '')
        setValueDraft(moneyText(e.value_estimate))
    }

    const move = async (e: FunnelEntry, next: FunnelStage, reason?: string) => {
        if (next === e.stage) return
        if (next === 'perdido' && !reason) { setLosing(true); return }
        setBusy(true)
        const prev = entries
        setEntries(list => list.map(x => x.id === e.id ? { ...x, stage: next, stage_changed_at: new Date().toISOString(), lost_reason: next === 'perdido' ? (reason ?? null) : null } : x))
        try {
            const res = await fetch(`/api/funnel/${e.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: next, lost_reason: reason }) })
            if (!res.ok) throw new Error()
            toast.success(`${e.title}: ${STAGE_LABELS[next].toLowerCase()}`)
            setSelected(s => s && s.id === e.id ? { ...s, stage: next, stage_changed_at: new Date().toISOString(), lost_reason: next === 'perdido' ? (reason ?? null) : null } : s)
            setLosing(false)
            router.refresh()
        } catch {
            setEntries(prev)
            toast.error('Não foi possível mover o card')
        } finally {
            setBusy(false)
        }
    }

    const saveDetails = async () => {
        if (!selected) return
        setBusy(true)
        const value = parseMoney(valueDraft)
        try {
            const res = await fetch(`/api/funnel/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: notesDraft, value_estimate: value }) })
            if (!res.ok) throw new Error()
            setEntries(list => list.map(x => x.id === selected.id ? { ...x, notes: notesDraft || null, value_estimate: value } : x))
            setSelected(s => s ? { ...s, notes: notesDraft || null, value_estimate: value } : s)
            toast.success('Salvo')
            router.refresh()
        } catch {
            toast.error('Não foi possível salvar')
        } finally {
            setBusy(false)
        }
    }

    const remove = async (e: FunnelEntry) => {
        setBusy(true)
        try {
            const res = await fetch(`/api/funnel/${e.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            setEntries(list => list.filter(x => x.id !== e.id))
            setSelected(null)
            toast.success('Card removido')
            router.refresh()
        } catch {
            toast.error('Não foi possível remover')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="min-h-full bg-background">
            <Header title="Funil de Vendas" />
            <div className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-4 pb-10 space-y-4">
                <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center gap-2 h-11 px-3 rounded-xl bg-foreground/[0.06] focus-within:ring-2 focus-within:ring-primary/40">
                        <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar card ou cliente" className="flex-1 min-w-0 bg-transparent text-[17px] outline-none" />
                    </label>
                    <button type="button" onClick={() => setCreating(true)} className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold inline-flex items-center gap-1.5 shrink-0">
                        <Plus className="w-[18px] h-[18px]" /> Novo
                    </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                    <Stat label="Em aberto" value={brl(totalOpen)} />
                    <Stat label="Fechados" value={String(closedCount)} />
                    <Stat label="Perdidos" value={String(lostCount)} />
                    {convRate != null && <Stat label="Conversão" value={`${convRate}%`} />}
                </div>

                {/* Phones: one stage at a time */}
                <div className="lg:hidden space-y-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                        {FUNNEL_STAGES.map(s => {
                            const list = byStage.get(s) ?? []
                            return (
                                <button key={s} type="button" onClick={() => setStage(s)} className={cn('shrink-0 h-9 pl-3 pr-2.5 rounded-full text-[15px] font-medium inline-flex items-center gap-1.5', stage === s ? 'bg-foreground text-background' : 'bg-foreground/[0.06]')}>
                                    <span className={cn('w-2 h-2 rounded-full', STAGE_DOTS[s])} />
                                    {STAGE_LABELS[s]}
                                    <span className={cn('min-w-[20px] h-5 px-1.5 rounded-full text-[12px] font-semibold inline-flex items-center justify-center', stage === s ? 'bg-background/20' : 'bg-foreground/10')}>{list.length}</span>
                                </button>
                            )
                        })}
                    </div>
                    <CardList entries={byStage.get(stage) ?? []} onOpen={openDetail} empty={`Nenhum card em “${STAGE_LABELS[stage]}”.`} />
                </div>

                {/* Desktop: all columns, drag to move */}
                <div className="hidden lg:grid grid-cols-5 gap-3 items-start">
                    {FUNNEL_STAGES.map(s => {
                        const list = byStage.get(s) ?? []
                        const total = list.reduce((sum, e) => sum + e.value_estimate, 0)
                        return (
                            <section
                                key={s}
                                aria-label={STAGE_LABELS[s]}
                                onDragOver={e => { e.preventDefault(); setOver(s) }}
                                onDragLeave={() => setOver(o => (o === s ? null : o))}
                                onDrop={e => {
                                    e.preventDefault(); setOver(null)
                                    const entry = entries.find(x => x.id === dragId)
                                    if (entry) move(entry, s)
                                }}
                                className={cn('rounded-2xl bg-foreground/[0.03] p-2 min-h-[60vh] transition-colors', over === s && 'bg-primary/10 ring-2 ring-primary/40')}
                            >
                                <header className="flex items-center gap-2 px-2 py-1.5">
                                    <span className={cn('w-2 h-2 rounded-full', STAGE_DOTS[s])} />
                                    <h2 className="text-[15px] font-semibold flex-1 truncate">{STAGE_LABELS[s]}</h2>
                                    <span className="text-[13px] text-muted-foreground tabular-nums">{list.length}</span>
                                </header>
                                {total > 0 && <p className="px-2 pb-1.5 text-[12px] text-muted-foreground tabular-nums">{brl(total)}</p>}
                                <div className="space-y-2">
                                    {list.map(e => (
                                        <div key={e.id} draggable onDragStart={() => setDragId(e.id)} onDragEnd={() => setDragId(null)} className={cn(dragId === e.id && 'opacity-50')}>
                                            <Card e={e} onOpen={() => openDetail(e)} />
                                        </div>
                                    ))}
                                    {!list.length && <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">Vazio</p>}
                                </div>
                            </section>
                        )
                    })}
                </div>
            </div>

            {selected && (
                <Sheet open onClose={() => setSelected(null)} title={selected.title} subtitle={nameOf(selected)}>
                    <div className="space-y-5">
                        <div tabIndex={-1} data-autofocus className="outline-none" aria-hidden />
                        <Group>
                            <Row label="Estágio" value={`${STAGE_LABELS[selected.stage]} · há ${ageLabel(daysSince(selected.stage_changed_at))}`} />
                            <Row label="Origem" value={SOURCE_LABELS[selected.source]} />
                            {selected.assignee_name && <Row label="Responsável" value={selected.assignee_name} />}
                            {selected.lost_reason && <Row label="Motivo da perda" value={selected.lost_reason} />}
                        </Group>

                        <Group title="Valor e observações">
                            <Field label="Valor estimado">
                                <TextInput inputMode="decimal" value={valueDraft} onChange={e => setValueDraft(e.target.value)} placeholder="0,00" />
                            </Field>
                            <Field label="Observações">
                                <TextArea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} placeholder="Anotações sobre esse contato…" />
                            </Field>
                        </Group>
                        <button type="button" disabled={busy} onClick={saveDetails} className="w-full h-11 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1] text-[15px] font-medium disabled:opacity-50">Salvar</button>

                        <div className="space-y-2">
                            <p className="px-1 text-[13px] text-muted-foreground">Mover para</p>
                            <div className="grid grid-cols-2 gap-2">
                                {FUNNEL_STAGES.map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        disabled={busy || s === selected.stage}
                                        onClick={() => move(selected, s)}
                                        className={cn('h-12 rounded-xl px-3 inline-flex items-center gap-2 text-[15px] font-medium text-left', s === selected.stage ? 'bg-foreground text-background' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}
                                    >
                                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', STAGE_DOTS[s])} />
                                        <span className="truncate">{STAGE_LABELS[s]}</span>
                                    </button>
                                ))}
                            </div>
                            {losing && (
                                <div className="rounded-2xl bg-card border border-border/60 p-3 space-y-2">
                                    <p className="text-[13px] text-muted-foreground">Por que foi perdido?</p>
                                    <TextInput value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="Ex.: achou caro, comprou em outro lugar…" />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setLosing(false)} className="flex-1 h-10 rounded-full bg-foreground/[0.06] text-[14px] font-medium">Cancelar</button>
                                        <button type="button" disabled={busy || !lostReason.trim()} onClick={() => move(selected, 'perdido', lostReason.trim())} className="flex-1 h-10 rounded-full bg-red-600 text-white text-[14px] font-medium disabled:opacity-50">Marcar perdido</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {selected.customer_id && (
                                <a href={`/customers/${selected.customer_id}`} className="flex-1 h-12 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center gap-1">Abrir cliente <ExternalLink className="w-4 h-4" /></a>
                            )}
                            {phoneOf(selected) && (
                                <a href={`https://wa.me/${waNumber(phoneOf(selected)!)}`} target="_blank" rel="noreferrer" className="h-12 px-5 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-[17px] font-medium inline-flex items-center gap-1.5">
                                    <MessageCircle className="w-5 h-5" /> WhatsApp
                                </a>
                            )}
                            <button type="button" disabled={busy} onClick={() => remove(selected)} aria-label="Remover card" className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center disabled:opacity-50">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </Sheet>
            )}

            {creating && (
                <NewLeadSheet
                    customers={customers}
                    busy={busy}
                    onClose={() => setCreating(false)}
                    onCreate={async input => {
                        setBusy(true)
                        try {
                            const res = await fetch('/api/funnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
                            const data = await res.json().catch(() => ({}))
                            if (!res.ok) throw new Error(data.error || 'Erro')
                            toast.success('Card criado no funil')
                            setCreating(false)
                            router.refresh()
                        } catch (err) {
                            toast.error((err as Error).message || 'Não foi possível criar o card')
                        } finally {
                            setBusy(false)
                        }
                    }}
                />
            )}
        </div>
    )
}

function NewLeadSheet({ customers, busy, onClose, onCreate }: {
    customers: CustomerOption[]
    busy: boolean
    onClose: () => void
    onCreate: (input: { title: string; customer_id?: string; lead_name?: string; lead_phone?: string; value_estimate: number; notes?: string }) => void
}) {
    const [title, setTitle] = useState('')
    const [customerId, setCustomerId] = useState('')
    const [leadName, setLeadName] = useState('')
    const [leadPhone, setLeadPhone] = useState('')
    const [value, setValue] = useState('')
    const [notes, setNotes] = useState('')

    const submit = () => {
        if (!title.trim()) { toast.error('Dê um título para o card'); return }
        if (!customerId && !leadName.trim()) { toast.error('Escolha um cliente ou informe o nome do lead'); return }
        onCreate({
            title: title.trim(),
            customer_id: customerId || undefined,
            lead_name: customerId ? undefined : leadName.trim(),
            lead_phone: customerId ? undefined : leadPhone.trim() || undefined,
            value_estimate: parseMoney(value),
            notes: notes.trim() || undefined,
        })
    }

    return (
        <Sheet open onClose={onClose} title="Novo card no funil">
            <div className="space-y-5">
                <Group title="O que é">
                    <Field label="Título" htmlFor="funil-title">
                        <TextInput id="funil-title" data-autofocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Troca de tela iPhone 12" />
                    </Field>
                </Group>

                <Group title="Cliente ou lead">
                    <SelectRow
                        id="funil-customer"
                        label="Cliente cadastrado"
                        value={customerId}
                        onChange={setCustomerId}
                        placeholder="Nenhum (é um lead novo)"
                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                    />
                    {!customerId && (
                        <>
                            <Field label="Nome do lead">
                                <TextInput value={leadName} onChange={e => setLeadName(e.target.value)} placeholder="Nome de quem entrou em contato" />
                            </Field>
                            <Field label="Telefone / WhatsApp">
                                <TextInput value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder="(11) 99999-9999" />
                            </Field>
                        </>
                    )}
                </Group>

                <Group title="Detalhes">
                    <Field label="Valor estimado">
                        <TextInput inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" />
                    </Field>
                    <Field label="Observações">
                        <TextArea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contexto, o que a pessoa precisa…" />
                    </Field>
                </Group>

                <button type="button" disabled={busy} onClick={submit} className="w-full h-12 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold disabled:opacity-50">Criar card</button>
            </div>
        </Sheet>
    )
}

function CardList({ entries, onOpen, empty }: { entries: FunnelEntry[]; onOpen: (e: FunnelEntry) => void; empty: string }) {
    if (!entries.length) return <p className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-[15px] text-muted-foreground">{empty}</p>
    return (
        <div className="space-y-2">
            {entries.map(e => <Card key={e.id} e={e} onOpen={() => onOpen(e)} />)}
        </div>
    )
}

function Card({ e, onOpen }: { e: FunnelEntry; onOpen: () => void }) {
    const d = daysSince(e.stage_changed_at)
    return (
        <button type="button" onClick={onOpen} className="w-full text-left rounded-2xl bg-card border border-border/60 p-3 transition-colors hover:bg-foreground/[0.02] active:scale-[0.99]">
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-1.5 h-5 inline-flex items-center rounded-full bg-foreground/[0.06] text-muted-foreground">{SOURCE_LABELS[e.source]}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" /> {ageLabel(d)}
                </span>
            </div>
            <p className="mt-1 text-[15px] font-medium leading-snug line-clamp-2">{e.title}</p>
            <div className="mt-1 flex items-center gap-3 text-[13px] text-muted-foreground min-w-0">
                <span className="inline-flex items-center gap-1 min-w-0"><UserRound className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{nameOf(e)}</span></span>
                {e.value_estimate > 0 && <span className="ml-auto tabular-nums text-foreground/80">{brl(e.value_estimate)}</span>}
            </div>
        </button>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="shrink-0 rounded-xl bg-foreground/[0.05] px-3.5 py-2">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-[15px] font-semibold tabular-nums">{value}</p>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 min-h-[48px]">
            <span className="text-[17px] shrink-0">{label}</span>
            <span className="text-[17px] text-right truncate text-muted-foreground">{value}</span>
        </div>
    )
}
