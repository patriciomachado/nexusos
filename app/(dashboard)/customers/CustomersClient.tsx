'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Cake, CheckCircle2, ChevronRight, Crown, Loader2, MessageCircle, Plus, Search, Settings2, UserPlus, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Sheet from '@/components/tasks/Sheet'
import { Field, Group, PrimaryButton, SecondaryButton, SwitchRow, TextArea, TextInput, brl } from '@/components/ui/form'
import { cn } from '@/lib/utils'

/**
 * Clientes: quick search (name, phone, CPF, e-mail or device IMEI),
 * segments (VIP, devendo, sumidos, aniversariantes, novos, etiquetas),
 * WhatsApp campaigns to a segment and the automatic messages.
 */

export interface CustomerRow {
    id: string
    name: string
    phone: string | null
    email: string | null
    cpf_cnpj: string | null
    birth_date: string | null
    tags: string[] | null
    created_at: string
    spent: number
    debt: number
    last_visit: string | null
    os_count: number
    purchases: number
}

type Segment = 'all' | 'vip' | 'debt' | 'gone' | 'birthday' | 'new' | `tag:${string}`

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : Infinity)
const initials = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')

export default function CustomersClient({ role }: { role: string }) {
    const manager = ['admin', 'owner', 'manager'].includes(role)
    const [rows, setRows] = useState<CustomerRow[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [imeiIds, setImeiIds] = useState<string[] | null>(null)
    const [segment, setSegment] = useState<Segment>('all')
    const [campaign, setCampaign] = useState(false)
    const [autoOpen, setAutoOpen] = useState(false)

    const load = useCallback(() => {
        fetch('/api/customers/insights').then(r => r.json()).then(d => setRows(Array.isArray(d.data) ? d.data : [])).catch(() => toast.error('Não foi possível carregar os clientes')).finally(() => setLoading(false))
    }, [])
    useEffect(() => { load() }, [load])

    // A long number that matches no phone/CPF may be an IMEI: ask the server.
    useEffect(() => {
        const d = digits(query)
        if (d.length < 8) { const t = setTimeout(() => setImeiIds(null), 0); return () => clearTimeout(t) }
        const h = setTimeout(() => {
            fetch(`/api/customers/search?imei=${d}`).then(r => r.json()).then(x => setImeiIds(Array.isArray(x.ids) ? x.ids : [])).catch(() => setImeiIds([]))
        }, 300)
        return () => clearTimeout(h)
    }, [query])

    const vipCut = useMemo(() => {
        const spent = rows.map(r => r.spent).filter(x => x > 0).sort((a, b) => b - a)
        return spent.length ? Math.max(500, spent[Math.min(spent.length - 1, Math.floor(spent.length * 0.1))]) : Infinity
    }, [rows])
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const isVip = useCallback((r: CustomerRow) => r.spent >= vipCut, [vipCut])
    const test: Record<string, (r: CustomerRow) => boolean> = {
        all: () => true,
        vip: isVip,
        debt: r => r.debt > 0,
        gone: r => r.last_visit != null && daysSince(r.last_visit) > 90,
        birthday: r => !!r.birth_date && r.birth_date.slice(5, 7) === month,
        new: r => daysSince(r.created_at) <= 30,
    }
    const inSegment = (r: CustomerRow, s: Segment) => s.startsWith('tag:') ? (r.tags ?? []).includes(s.slice(4)) : test[s](r)
    const tags = useMemo(() => [...new Set(rows.flatMap(r => r.tags ?? []))].sort(), [rows])

    const shown = useMemo(() => {
        const q = norm(query.trim())
        const d = digits(query)
        return rows.filter(r => {
            if (!inSegment(r, segment)) return false
            if (!q) return true
            if (norm(`${r.name} ${r.email ?? ''}`).includes(q)) return true
            if (d.length >= 3 && (digits(r.phone).includes(d) || digits(r.cpf_cnpj).includes(d))) return true
            return !!imeiIds?.includes(r.id)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, query, segment, imeiIds, vipCut])

    const count = (s: Segment) => rows.filter(r => inSegment(r, s)).length
    const SEGMENTS: { id: Segment; label: string }[] = [
        { id: 'all', label: 'Todos' },
        { id: 'vip', label: 'VIP' },
        { id: 'debt', label: 'Devendo' },
        { id: 'gone', label: 'Sumidos 90 dias' },
        { id: 'birthday', label: 'Aniversário no mês' },
        { id: 'new', label: 'Novos' },
        ...tags.map(t => ({ id: `tag:${t}` as Segment, label: `#${t}` })),
    ]

    return (
        <div className="min-h-full bg-background">
            <Header title="Clientes" />
            <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-4 pb-16 space-y-4">
                <div className="flex items-center gap-2">
                    <label className="flex-1 min-w-0 flex items-center gap-2 h-12 px-3 rounded-xl bg-foreground/[0.06]">
                        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome, telefone, CPF ou IMEI" className="flex-1 min-w-0 bg-transparent text-[17px] outline-none" />
                        {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar"><X className="w-4 h-4 text-muted-foreground" /></button>}
                    </label>
                    <Link href="/customers/new" aria-label="Novo cliente" className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"><UserPlus className="w-5 h-5" /></Link>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                    {SEGMENTS.map(s => (
                        <button key={s.id} type="button" onClick={() => setSegment(s.id)} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium inline-flex items-center gap-1.5', segment === s.id ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06]')}>
                            {s.label} <span className="text-[12px] opacity-70 tabular-nums">{loading ? '' : count(s.id)}</span>
                        </button>
                    ))}
                </div>

                {manager && (
                    <div className="flex gap-2">
                        <SecondaryButton className="flex-1 text-[16px]" onClick={() => shown.length ? setCampaign(true) : toast.message('Nenhum cliente neste filtro.')}>
                            <MessageCircle className="w-5 h-5" /> Mensagem para {segment === 'all' && !query ? 'todos' : 'estes'} ({shown.length})
                        </SecondaryButton>
                        <SecondaryButton onClick={() => setAutoOpen(true)} aria-label="Automações"><Settings2 className="w-5 h-5" /></SecondaryButton>
                    </div>
                )}

                {loading ? <div className="h-64 rounded-2xl bg-card border border-border/60 animate-pulse" /> : shown.length ? (
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {shown.slice(0, 300).map(r => (
                            <li key={r.id}>
                                <Link href={`/customers/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.02]">
                                    <span className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0', isVip(r) ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300' : 'bg-foreground/[0.06] text-muted-foreground')}>{initials(r.name) || '?'}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-[16px] font-medium truncate">{r.name}</span>
                                            {isVip(r) && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="VIP" />}
                                            {r.birth_date?.slice(5, 7) === month && <Cake className="w-3.5 h-3.5 text-pink-500 shrink-0" aria-label="Aniversário no mês" />}
                                        </span>
                                        <span className="block text-[13px] text-muted-foreground truncate">
                                            {[r.phone, r.last_visit ? `última visita há ${daysSince(r.last_visit)} dias` : 'sem visitas'].filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                    <span className="flex flex-col items-end shrink-0">
                                        {r.spent > 0 && <span className="text-[14px] font-medium tabular-nums">{brl(r.spent)}</span>}
                                        {r.debt > 0 && <span className="text-[12px] font-medium text-red-600 dark:text-red-400 tabular-nums">deve {brl(r.debt)}</span>}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-muted-foreground space-y-3">
                        <p className="text-[15px]">{query ? 'Ninguém encontrado.' : 'Nenhum cliente neste filtro.'}</p>
                        <Link href="/customers/new" className="inline-flex items-center gap-1 text-primary text-[15px] font-medium"><Plus className="w-4 h-4" /> Cadastrar cliente</Link>
                    </div>
                )}
                {shown.length > 300 && <p className="px-4 text-[13px] text-muted-foreground">Mostrando 300 de {shown.length}. Use a busca para achar os outros.</p>}
            </div>

            {campaign && <CampaignSheet targets={shown} onClose={() => setCampaign(false)} />}
            {autoOpen && <AutomationsSheet onClose={() => setAutoOpen(false)} />}
        </div>
    )
}

/* ─────────────────────────────── Campaign ─────────────────────────────── */

function CampaignSheet({ targets, onClose }: { targets: CustomerRow[]; onClose: () => void }) {
    const withPhone = targets.filter(t => digits(t.phone).length >= 10)
    const [text, setText] = useState('Oi, {nome}! Tudo bem? Aqui é da loja 😊 ')
    const [progress, setProgress] = useState<{ sent: number; skipped: number; done: number } | null>(null)
    const [running, setRunning] = useState(false)
    const preview = text.replace(/\{nome\}/g, withPhone[0]?.name.split(' ')[0] ?? 'Maria')

    const start = async () => {
        if (!text.trim()) return toast.error('Escreva a mensagem.')
        setRunning(true)
        let sent = 0, skipped = 0, done = 0, campaignId: string | undefined
        try {
            for (let i = 0; i < withPhone.length; i += 25) {
                const batch = withPhone.slice(i, i + 25).map(t => t.id)
                const res = await fetch('/api/customers/campaign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_ids: batch, text, campaign_id: campaignId }) })
                const d = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(d.error || 'Falha no envio')
                campaignId = d.campaign_id
                sent += d.sent; skipped += d.skipped; done += batch.length
                setProgress({ sent, skipped, done })
            }
            toast.success(`${sent} mensagens enviadas`)
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setRunning(false)
        }
    }

    return (
        <Sheet
            open
            onClose={() => !running && onClose()}
            title="Mensagem no WhatsApp"
            subtitle={`${withPhone.length} de ${targets.length} clientes têm WhatsApp`}
            full
            footer={progress && progress.done >= withPhone.length ? (
                <PrimaryButton className="w-full" onClick={onClose}>Pronto</PrimaryButton>
            ) : (
                <PrimaryButton className="w-full" onClick={start} disabled={running || !withPhone.length}>{running && <Loader2 className="w-5 h-5 animate-spin" />}Enviar para {withPhone.length}</PrimaryButton>
            )}
        >
            <div className="space-y-4">
                <Group footer="Use {nome} para o primeiro nome. As mensagens saem pelo número da loja, aos poucos, para o WhatsApp não bloquear.">
                    <Field label="Mensagem" htmlFor="cp-text"><TextArea id="cp-text" rows={5} value={text} onChange={e => setText(e.target.value)} /></Field>
                </Group>
                <div className="space-y-1">
                    <p className="px-1 text-[13px] text-muted-foreground">Como fica</p>
                    <div className="rounded-2xl rounded-tl-md bg-emerald-600/10 px-4 py-3 text-[15px] whitespace-pre-wrap">{preview}</div>
                </div>
                {progress && (
                    <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-2">
                        <div className="h-2 rounded-full bg-foreground/[0.06] overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${(progress.done / Math.max(1, withPhone.length)) * 100}%` }} /></div>
                        <p className="text-[15px]"><CheckCircle2 className="w-4 h-4 inline text-emerald-600" /> {progress.sent} enviadas{progress.skipped ? ` · ${progress.skipped} puladas` : ''} · {progress.done}/{withPhone.length}</p>
                    </div>
                )}
                <p className="px-1 text-[13px] text-muted-foreground">Dica: mande para grupos pequenos e com um motivo (promoção, novidade). Mensagens em massa sem contexto aumentam o risco de bloqueio do número.</p>
            </div>
        </Sheet>
    )
}

/* ────────────────────────────── Automations ────────────────────────────── */

interface Auto { birthday: boolean; birthday_text: string; review: boolean; review_days: number; review_text: string; google_review_url: string | null; whatsapp_ready: boolean; can_edit: boolean }

function AutomationsSheet({ onClose }: { onClose: () => void }) {
    const [a, setA] = useState<Auto | null>(null)
    const [saving, setSaving] = useState(false)
    useEffect(() => { fetch('/api/customers/automations').then(r => r.json()).then(d => d && 'birthday' in d && setA(d)).catch(() => {}) }, [])
    const save = async () => {
        if (!a) return
        setSaving(true)
        try {
            const res = await fetch('/api/customers/automations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) })
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Não foi possível salvar')
            toast.success('Automações salvas'); onClose()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }
    return (
        <Sheet open onClose={onClose} title="Mensagens automáticas" full footer={a?.can_edit ? <PrimaryButton className="w-full" onClick={save} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton> : undefined}>
            {!a ? <div className="h-40 animate-pulse rounded-2xl bg-foreground/[0.04]" /> : (
                <div className="space-y-5">
                    {!a.whatsapp_ready && <p className="rounded-2xl bg-orange-500/10 text-orange-800 dark:text-orange-300 px-4 py-3 text-[15px]">Conecte o WhatsApp da loja em Alice → Configurações para as mensagens saírem sozinhas.</p>}
                    <Group footer="Enviada às 10h no dia do aniversário (precisa da data de nascimento no cadastro).">
                        <SwitchRow label="Parabéns no aniversário" checked={a.birthday} onChange={v => setA({ ...a, birthday: v })} />
                        {a.birthday && <Field label="Mensagem" htmlFor="au-bd"><TextArea id="au-bd" rows={3} value={a.birthday_text} onChange={e => setA({ ...a, birthday_text: e.target.value })} /></Field>}
                    </Group>
                    <Group footer={a.google_review_url ? 'Enviada alguns dias depois de a OS ser entregue. Variáveis: {nome}, {aparelho}, {link}, {loja}.' : 'Cadastre o link de avaliação do Google em Configurações → Loja para ativar.'}>
                        <SwitchRow label="Pedir avaliação no Google" checked={a.review} onChange={v => setA({ ...a, review: v })} />
                        {a.review && (
                            <>
                                <Field label="Dias depois da entrega" htmlFor="au-days"><TextInput id="au-days" inputMode="numeric" value={String(a.review_days)} onChange={e => setA({ ...a, review_days: Number(e.target.value.replace(/\D/g, '')) || 1 })} /></Field>
                                <Field label="Mensagem" htmlFor="au-rv"><TextArea id="au-rv" rows={3} value={a.review_text} onChange={e => setA({ ...a, review_text: e.target.value })} /></Field>
                            </>
                        )}
                    </Group>
                </div>
            )}
        </Sheet>
    )
}
