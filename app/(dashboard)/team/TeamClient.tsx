'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Clock, Loader2, LogIn, LogOut, MessageCircle, Plus, Trophy, UserRound } from 'lucide-react'
import Header from '@/components/layout/Header'
import Segmented from '@/components/ui/Segmented'
import Sheet from '@/components/tasks/Sheet'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, SwitchRow, TextInput, brl, parseMoney } from '@/components/ui/form'
import { ROLE_LABELS, permissionModules } from '@/components/layout/nav-config'
import { cn } from '@/lib/utils'

/**
 * Equipe: people (invite by WhatsApp, role, active), month performance
 * (ranking, goals, commissions), time clock, who-did-what and, for the
 * owner, which pages each role sees.
 */

interface Member { id: string; full_name: string | null; email: string; phone: string | null; role: string; is_active: boolean; clerk_id: string | null }
interface Perf { id: string; name: string; role: string; sales: number; sales_count: number; os: number; os_count: number; total: number; goal: number; progress: number | null; commission: number; sales_pct: number; technician: { commission_type: string; commission_value: number } | null }
interface Punch { id: string; user_id: string; kind: 'in' | 'out'; at: string; users?: { full_name?: string } | null }
interface Ev { at: string; who: string; text: string; href?: string; kind: string }

const ROLES = ['manager', 'cashier', 'technician', 'attendant'] as const
const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('sv-SE')
const dayLabel = (key: string) => {
    const today = new Date().toLocaleDateString('sv-SE')
    const y = new Date(Date.now() - 86_400_000).toLocaleDateString('sv-SE')
    if (key === today) return 'Hoje'
    if (key === y) return 'Ontem'
    const s = new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
    return s.charAt(0).toUpperCase() + s.slice(1)
}
const hours = (ms: number) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` }

/** Worked time from punches (ascending), counting an open "in" until now. */
function worked(punches: Punch[]) {
    const asc = [...punches].sort((a, b) => a.at.localeCompare(b.at))
    let total = 0, start: number | null = null
    for (const p of asc) {
        if (p.kind === 'in') start = new Date(p.at).getTime()
        else if (start != null) { total += new Date(p.at).getTime() - start; start = null }
    }
    if (start != null && dayKey(new Date(start).toISOString()) === dayKey(new Date().toISOString())) total += Date.now() - start
    return total
}

async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(typeof d.error === 'string' ? d.error : 'Não foi possível salvar')
    return d
}

type Tab = 'people' | 'perf' | 'clock' | 'log' | 'perms'

export default function TeamClient({ role, meId, storeName, initialTab }: { role: string; meId: string; storeName: string; initialTab?: string }) {
    const manager = ['admin', 'owner', 'manager'].includes(role)
    const owner = ['admin', 'owner'].includes(role)
    const allowed: Tab[] = owner ? ['people', 'perf', 'clock', 'log', 'perms'] : manager ? ['people', 'perf', 'clock', 'log'] : ['clock']
    const [tab, setTab] = useState<Tab>(allowed.includes(initialTab as Tab) ? initialTab as Tab : manager ? 'people' : 'clock')

    return (
        <div className="min-h-full bg-background">
            <Header title={manager ? 'Equipe' : 'Meu ponto'} />
            <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 pb-16 space-y-4">
                {manager && (
                    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                        <Segmented ariaLabel="Ver" value={tab} onChange={setTab} options={[
                            { value: 'people', label: 'Pessoas' },
                            { value: 'perf', label: 'Desempenho' },
                            { value: 'clock', label: 'Ponto' },
                            { value: 'log', label: 'Atividade' },
                            ...(owner ? [{ value: 'perms' as const, label: 'Permissões' }] : []),
                        ]} />
                    </div>
                )}
                {tab === 'people' && manager && <People storeName={storeName} owner={owner} meId={meId} />}
                {tab === 'perf' && manager && <Performance owner={owner} />}
                {tab === 'clock' && <TimeClock manager={manager} meId={meId} />}
                {tab === 'log' && manager && <Activity />}
                {tab === 'perms' && owner && <Permissions />}
            </div>
        </div>
    )
}

/* ─────────────────────────────── People ─────────────────────────────── */

function People({ storeName, owner, meId }: { storeName: string; owner: boolean; meId: string }) {
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState<Member | 'new' | null>(null)
    const [settings, setSettings] = useState<{ members: Record<string, { sales_pct: number; goal: number }> } | null>(null)
    const load = useCallback(() => {
        Promise.all([fetch('/api/users').then(r => r.json()), fetch('/api/team/settings').then(r => r.json())])
            .then(([u, s]) => { setMembers(Array.isArray(u) ? u : []); if (s?.members) setSettings(s) })
            .finally(() => setLoading(false))
    }, [])
    useEffect(() => { load() }, [load])
    const active = members.filter(m => m.is_active !== false)
    const inactive = members.filter(m => m.is_active === false)

    return (
        <div className="space-y-4">
            <PrimaryButton className="w-full" onClick={() => setOpen('new')}><Plus className="w-5 h-5" /> Adicionar pessoa</PrimaryButton>
            {loading ? <div className="h-40 rounded-2xl bg-card border border-border/60 animate-pulse" /> : (
                <>
                    <MemberList list={active} onOpen={setOpen} meId={meId} />
                    {inactive.length > 0 && (<><p className="px-4 text-[13px] font-medium text-muted-foreground">Desativados</p><MemberList list={inactive} onOpen={setOpen} meId={meId} /></>)}
                </>
            )}
            {open && <MemberSheet m={open === 'new' ? null : open} storeName={storeName} owner={owner} settings={open !== 'new' ? settings?.members[open.id] : undefined} onClose={() => setOpen(null)} onDone={load} />}
        </div>
    )
}

function MemberList({ list, onOpen, meId }: { list: Member[]; onOpen: (m: Member) => void; meId: string }) {
    return (
        <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
            {list.map(m => (
                <li key={m.id}>
                    <button type="button" onClick={() => onOpen(m)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]">
                        <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[15px] font-semibold shrink-0">{(m.full_name ?? m.email).charAt(0).toUpperCase()}</span>
                        <span className="flex-1 min-w-0">
                            <span className="block text-[16px] font-medium truncate">{m.full_name ?? m.email}{m.id === meId ? ' (você)' : ''}</span>
                            <span className="block text-[13px] text-muted-foreground truncate">{ROLE_LABELS[m.role] ?? m.role}{m.clerk_id?.startsWith('temp_') ? ' · convite pendente' : ''}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                    </button>
                </li>
            ))}
        </ul>
    )
}

function MemberSheet({ m, storeName, owner, settings, onClose, onDone }: { m: Member | null; storeName: string; owner: boolean; settings?: { sales_pct: number; goal: number }; onClose: () => void; onDone: () => void }) {
    const [name, setName] = useState(m?.full_name ?? '')
    const [email, setEmail] = useState(m?.email ?? '')
    const [phone, setPhone] = useState(m?.phone ?? '')
    const [role, setRole] = useState(m?.role ?? 'cashier')
    const [active, setActive] = useState(m?.is_active !== false)
    const [pct, setPct] = useState(settings?.sales_pct ? String(settings.sales_pct) : '')
    const [goal, setGoal] = useState(settings?.goal ? String(settings.goal) : '')
    const [busy, setBusy] = useState(false)
    const [invite, setInvite] = useState<{ email: string; phone: string } | null>(null)
    const pending = m?.clerk_id?.startsWith('temp_')

    const inviteText = (mail: string) => `Oi${name ? `, ${name.split(' ')[0]}` : ''}! Você foi adicionado(a) à equipe da ${storeName} no Nexus OS. Crie seu acesso com o e-mail ${mail} aqui: ${typeof window !== 'undefined' ? window.location.origin : ''}/sign-up`
    const shareInvite = (mail: string, tel: string) => {
        const d = tel.replace(/\D/g, '')
        const url = d.length >= 10 ? `https://wa.me/${d.length <= 11 ? `55${d}` : d}?text=${encodeURIComponent(inviteText(mail))}` : `https://wa.me/?text=${encodeURIComponent(inviteText(mail))}`
        window.open(url, '_blank')
    }

    const save = async () => {
        setBusy(true)
        try {
            if (!m) {
                if (!name.trim() || !email.trim()) throw new Error('Informe nome e e-mail.')
                await send('/api/users', 'POST', { full_name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null, role })
                toast.success('Pessoa adicionada')
                setInvite({ email: email.trim().toLowerCase(), phone })
                onDone()
                return
            }
            await send(`/api/users/${m.id}`, 'PATCH', { full_name: name.trim(), phone: phone.trim() || null, role, is_active: active })
            await send('/api/team/settings', 'PUT', { member: { id: m.id, sales_pct: Number(pct.replace(',', '.')) || 0, goal: parseMoney(goal) } })
            toast.success('Salvo'); onDone(); onClose()
        } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
    }

    if (invite) {
        return (
            <Sheet open onClose={onClose} title="Convite" footer={<PrimaryButton className="w-full" onClick={() => shareInvite(invite.email, invite.phone)}><MessageCircle className="w-5 h-5" /> Enviar convite no WhatsApp</PrimaryButton>}>
                <div className="space-y-3">
                    <p className="text-[15px]">{name.split(' ')[0]} entra criando o acesso com o e-mail <strong>{invite.email}</strong>. A conta já fica ligada à loja, com a função escolhida.</p>
                    <div className="rounded-2xl bg-emerald-600/10 px-4 py-3 text-[15px] whitespace-pre-wrap">{inviteText(invite.email)}</div>
                </div>
            </Sheet>
        )
    }

    return (
        <Sheet open onClose={onClose} title={m ? (m.full_name ?? m.email) : 'Adicionar pessoa'} full footer={<PrimaryButton className="w-full" onClick={save} disabled={busy}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}{m ? 'Salvar' : 'Adicionar e convidar'}</PrimaryButton>}>
            <div className="space-y-5">
                <Group>
                    <Field label="Nome" htmlFor="tm-name"><TextInput id="tm-name" value={name} onChange={e => setName(e.target.value)} data-autofocus={!m || undefined} /></Field>
                    <Field label="E-mail (para entrar no app)" htmlFor="tm-email"><TextInput id="tm-email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!!m} /></Field>
                    <Field label="WhatsApp" htmlFor="tm-phone"><TextInput id="tm-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 98888-7777" /></Field>
                </Group>
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-muted-foreground">Função</p>
                    <Chips ariaLabel="Função" options={[...(owner ? ['admin'] : []), ...ROLES].map(r => ({ value: r, label: ROLE_LABELS[r] }))} value={role} onChange={setRole} />
                    <p className="px-1 text-[13px] text-muted-foreground">O que cada função vê: Equipe → Permissões.</p>
                </div>
                {m && (
                    <>
                        <Group title="Comissão e meta" footer="A comissão de técnico (por OS) fica no cadastro de técnicos; aqui é a comissão sobre as vendas do PDV.">
                            <div className="grid grid-cols-2 divide-x divide-border/60">
                                <Field label="Comissão nas vendas (%)" htmlFor="tm-pct"><TextInput id="tm-pct" inputMode="decimal" value={pct} onChange={e => setPct(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0" /></Field>
                                <Field label="Meta do mês (R$)" htmlFor="tm-goal"><TextInput id="tm-goal" inputMode="decimal" value={goal} onChange={e => setGoal(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Sem meta" /></Field>
                            </div>
                        </Group>
                        <Group><SwitchRow label="Ativo" description="Desativado não entra mais no app." checked={active} onChange={setActive} /></Group>
                        {pending && <SecondaryButton className="w-full" onClick={() => shareInvite(m.email, phone)}><MessageCircle className="w-5 h-5" /> Reenviar convite</SecondaryButton>}
                    </>
                )}
            </div>
        </Sheet>
    )
}

/* ───────────────────────────── Performance ───────────────────────────── */

function Performance({ owner }: { owner: boolean }) {
    const [month, setMonth] = useState(() => new Date().toLocaleDateString('sv-SE').slice(0, 7))
    const [data, setData] = useState<{ people: Perf[]; store: { total: number; goal: number } } | null>(null)
    const [editGoal, setEditGoal] = useState(false)
    const [goal, setGoal] = useState('')
    const load = useCallback(() => {
        fetch(`/api/team/stats?month=${month}`).then(r => r.json()).then(d => d?.people && setData(d)).catch(() => {})
    }, [month])
    useEffect(() => { load() }, [load])
    const shift = (n: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }
    const label = new Date(`${month}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const people = (data?.people ?? []).filter(p => p.total > 0 || p.goal > 0 || p.commission > 0)
    const store = data?.store
    const saveGoal = async () => {
        try { await send('/api/team/settings', 'PUT', { revenue_goal: parseMoney(goal) }); toast.success('Meta da loja salva'); setEditGoal(false); load() }
        catch (e) { toast.error((e as Error).message) }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <button type="button" onClick={() => shift(-1)} aria-label="Mês anterior" className="w-10 h-10 rounded-full bg-foreground/[0.06] flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
                <p className="text-[17px] font-semibold capitalize">{label}</p>
                <button type="button" onClick={() => shift(1)} aria-label="Próximo mês" className="w-10 h-10 rounded-full bg-foreground/[0.06] flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
            </div>

            {store && (
                <section className="rounded-2xl bg-card border border-border/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[15px] text-muted-foreground">Faturamento da equipe</p>
                        {owner && <button type="button" onClick={() => { setGoal(store.goal ? String(store.goal) : ''); setEditGoal(true) }} className="text-[15px] text-primary">{store.goal ? 'Meta' : 'Definir meta'}</button>}
                    </div>
                    <p className="text-[28px] font-semibold tabular-nums">{brl(store.total)}</p>
                    {store.goal > 0 && <Progress value={store.total / store.goal} label={`${Math.round((store.total / store.goal) * 100)}% da meta de ${brl(store.goal)}`} />}
                </section>
            )}

            {!data ? <div className="h-40 rounded-2xl bg-card border border-border/60 animate-pulse" /> : people.length ? (
                <ul className="space-y-2">
                    {people.map((p, i) => (
                        <li key={p.id} className="rounded-2xl bg-card border border-border/60 p-4 space-y-2">
                            <div className="flex items-center gap-3">
                                <span className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0', i === 0 ? 'bg-amber-400/25 text-amber-700 dark:text-amber-300' : i === 1 ? 'bg-zinc-400/25 text-zinc-600 dark:text-zinc-300' : i === 2 ? 'bg-orange-400/20 text-orange-700 dark:text-orange-300' : 'bg-foreground/[0.06] text-muted-foreground')}>
                                    {i < 3 ? <Trophy className="w-4 h-4" /> : i + 1}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[16px] font-medium truncate">{p.name}</span>
                                    <span className="block text-[13px] text-muted-foreground truncate">{[p.sales_count ? `${p.sales_count} vendas` : null, p.os_count ? `${p.os_count} OS` : null].filter(Boolean).join(' · ') || ROLE_LABELS[p.role] || p.role}</span>
                                </span>
                                <span className="text-[17px] font-semibold tabular-nums">{brl(p.total)}</span>
                            </div>
                            {p.goal > 0 && <Progress value={p.progress ?? 0} label={`${Math.round((p.progress ?? 0) * 100)}% da meta de ${brl(p.goal)}`} />}
                            {p.commission > 0 && <p className="text-[14px] text-emerald-700 dark:text-emerald-400">Comissão: <strong className="tabular-nums">{brl(p.commission)}</strong><span className="text-muted-foreground"> · {[p.sales_pct ? `${p.sales_pct}% das vendas` : null, p.technician?.commission_value ? (p.technician.commission_type === 'fixed' ? `${brl(p.technician.commission_value)} por OS` : `${p.technician.commission_value}% das OS`) : null].filter(Boolean).join(' + ')}</span></p>}
                        </li>
                    ))}
                </ul>
            ) : <p className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-[15px] text-muted-foreground">Sem vendas ou OS neste mês.</p>}
            <p className="px-1 text-[13px] text-muted-foreground">Vendas: PDV feitas pela pessoa. OS: recebidas no mês, pelo técnico da OS. Comissão de técnico: <Link href="/technicians" className="text-primary">Técnicos</Link>.</p>

            {editGoal && (
                <Sheet open onClose={() => setEditGoal(false)} title="Meta mensal da loja" footer={<PrimaryButton className="w-full" onClick={saveGoal}>Salvar</PrimaryButton>}>
                    <Group><Field label="Meta de faturamento (R$)" htmlFor="st-goal"><TextInput id="st-goal" inputMode="decimal" value={goal} onChange={e => setGoal(e.target.value.replace(/[^\d.,]/g, ''))} data-autofocus /></Field></Group>
                </Sheet>
            )}
        </div>
    )
}

function Progress({ value, label }: { value: number; label: string }) {
    const pct = Math.min(Math.max(value, 0), 1)
    return (
        <div className="space-y-1">
            <div className="h-2 rounded-full bg-foreground/[0.07] overflow-hidden"><div className={cn('h-full rounded-full', value >= 1 ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct * 100}%` }} /></div>
            <p className="text-[13px] text-muted-foreground">{label}{value >= 1 ? ' 🎉' : ''}</p>
        </div>
    )
}

/* ───────────────────────────── Time clock ───────────────────────────── */

function TimeClock({ manager, meId }: { manager: boolean; meId: string }) {
    const [punches, setPunches] = useState<Punch[]>([])
    const [all, setAll] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const load = useCallback(() => {
        fetch(`/api/team/clock?days=14${all ? '&all=1' : ''}`).then(r => r.json()).then(d => { if (d.error) setError(d.error); else setPunches(Array.isArray(d.data) ? d.data : []) }).catch(() => {})
    }, [all])
    useEffect(() => { load() }, [load])

    const mine = punches.filter(p => p.user_id === meId)
    const last = mine[0]
    const inside = last?.kind === 'in' && Date.now() - new Date(last.at).getTime() < 18 * 3_600_000
    const today = new Date().toLocaleDateString('sv-SE')
    const todayMine = mine.filter(p => dayKey(p.at) === today)

    const punch = async () => {
        setBusy(true)
        try { const d = await send('/api/team/clock', 'POST', {}); toast.success(d.kind === 'in' ? `Entrada às ${time(d.at)}` : `Saída às ${time(d.at)}`); load() }
        catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
    }

    const groups = useMemo(() => {
        const m = new Map<string, Map<string, Punch[]>>()
        for (const p of (all ? punches : mine)) {
            const d = dayKey(p.at)
            if (!m.has(d)) m.set(d, new Map())
            const byUser = m.get(d)!
            if (!byUser.has(p.user_id)) byUser.set(p.user_id, [])
            byUser.get(p.user_id)!.push(p)
        }
        return [...m].sort((a, b) => b[0].localeCompare(a[0]))
    }, [punches, mine, all])

    return (
        <div className="space-y-4">
            {error && <p className="rounded-2xl bg-orange-500/10 text-orange-800 dark:text-orange-300 px-4 py-3 text-[15px]">{error}</p>}
            <section className="rounded-2xl bg-card border border-border/60 p-5 text-center space-y-3">
                <p className="text-[15px] text-muted-foreground">{inside ? `Dentro desde ${time(last!.at)}` : last ? `Fora desde ${time(last.at)}${dayKey(last.at) !== today ? ` (${dayLabel(dayKey(last.at)).toLowerCase()})` : ''}` : 'Ainda sem registro'}</p>
                <p className="text-[34px] font-semibold tabular-nums">{hours(worked(todayMine))}</p>
                <p className="text-[13px] text-muted-foreground -mt-2">trabalhadas hoje</p>
                <button type="button" onClick={punch} disabled={busy} className={cn('w-full h-14 rounded-full text-[18px] font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60', inside ? 'bg-red-600' : 'bg-emerald-600')}>
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : inside ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    {inside ? 'Registrar saída' : 'Registrar entrada'}
                </button>
            </section>

            {manager && <Segmented ariaLabel="Mostrar" value={all ? 'all' : 'me'} onChange={v => setAll(v === 'all')} options={[{ value: 'me', label: 'Meu ponto' }, { value: 'all', label: 'Toda a equipe' }]} />}

            {groups.map(([day, byUser]) => (
                <section key={day} className="space-y-1.5">
                    <h3 className="px-4 text-[13px] font-medium text-muted-foreground">{dayLabel(day)}</h3>
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {[...byUser].map(([uid, ps]) => {
                            const asc = [...ps].sort((a, b) => a.at.localeCompare(b.at))
                            return (
                                <li key={uid} className="flex items-center gap-3 px-4 py-3">
                                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="flex-1 min-w-0">
                                        {all && <span className="block text-[15px] font-medium truncate">{ps[0].users?.full_name ?? 'Pessoa'}</span>}
                                        <span className="block text-[14px] text-muted-foreground truncate">{asc.map(p => `${p.kind === 'in' ? '↘' : '↗'} ${time(p.at)}`).join('  ')}</span>
                                    </span>
                                    <span className="text-[15px] font-semibold tabular-nums">{hours(worked(ps))}</span>
                                </li>
                            )
                        })}
                    </ul>
                </section>
            ))}
            {!groups.length && !error && <p className="px-4 text-center text-[15px] text-muted-foreground">Sem registros nos últimos 14 dias.</p>}
        </div>
    )
}

/* ────────────────────────────── Activity ────────────────────────────── */

function Activity() {
    const [data, setData] = useState<{ data: Ev[]; users: { id: string; name?: string }[] } | null>(null)
    const [who, setWho] = useState('')
    useEffect(() => {
        fetch(`/api/team/activity${who ? `?user=${who}` : ''}`).then(r => r.json()).then(d => d?.data && setData(d)).catch(() => {})
    }, [who])
    const byDay = useMemo(() => {
        const m = new Map<string, Ev[]>()
        for (const e of data?.data ?? []) { const k = dayKey(e.at); if (!m.has(k)) m.set(k, []); m.get(k)!.push(e) }
        return [...m]
    }, [data])
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                <button type="button" onClick={() => setWho('')} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium', !who ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06]')}>Todos</button>
                {(data?.users ?? []).map(u => (
                    <button key={u.id} type="button" onClick={() => setWho(u.id)} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium', who === u.id ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06]')}>{(u.name ?? '').split(' ')[0] || 'Pessoa'}</button>
                ))}
            </div>
            {!data ? <div className="h-40 rounded-2xl bg-card border border-border/60 animate-pulse" /> : byDay.length ? byDay.map(([day, evs]) => (
                <section key={day} className="space-y-1.5">
                    <h3 className="px-4 text-[13px] font-medium text-muted-foreground">{dayLabel(day)}</h3>
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {evs.map((e, i) => {
                            const body = (
                                <>
                                    <span className="text-[13px] text-muted-foreground tabular-nums w-11 shrink-0">{time(e.at)}</span>
                                    <span className="flex-1 min-w-0"><span className="block text-[15px] truncate">{e.text}</span><span className="block text-[13px] text-muted-foreground truncate"><UserRound className="w-3 h-3 inline" /> {e.who}</span></span>
                                </>
                            )
                            return <li key={i}>{e.href ? <Link href={e.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-foreground/[0.02]">{body}<ChevronRight className="w-4 h-4 text-muted-foreground/60" /></Link> : <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>}</li>
                        })}
                    </ul>
                </section>
            )) : <p className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-[15px] text-muted-foreground">Nada nos últimos 14 dias.</p>}
        </div>
    )
}

/* ───────────────────────────── Permissions ───────────────────────────── */

function Permissions() {
    const modules = permissionModules()
    const [perms, setPerms] = useState<Record<string, string[]> | null>(null)
    const [role, setRole] = useState<string>('cashier')
    const [saving, setSaving] = useState(false)
    useEffect(() => { fetch('/api/team/settings').then(r => r.json()).then(d => setPerms(d?.permissions ?? {})).catch(() => setPerms({})) }, [])
    if (!perms) return <div className="h-40 rounded-2xl bg-card border border-border/60 animate-pulse" />
    const available = modules.filter(m => m.roles.includes(role) || (role === 'attendant' && ['/service-orders', '/pdv', '/cash-register', '/team'].includes(m.href)))
    const hidden = new Set(perms[role] ?? [])
    const toggle = (href: string, on: boolean) => setPerms(p => ({ ...p!, [role]: on ? (p![role] ?? []).filter(x => x !== href) : [...(p![role] ?? []), href] }))
    const save = async () => {
        setSaving(true)
        try { await send('/api/team/settings', 'PUT', { permissions: perms }); toast.success('Permissões salvas. Valem no próximo acesso.') }
        catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }
    return (
        <div className="space-y-4">
            <Segmented ariaLabel="Função" value={role} onChange={setRole} options={ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))} />
            <Group footer="Desligado some do menu dessa função. O que já é restrito pela função (ex.: Relatórios para Caixa) não aparece aqui.">
                {available.map(m => <SwitchRow key={m.href} label={m.label} checked={!hidden.has(m.href)} onChange={on => toggle(m.href, on)} />)}
                {!available.length && <p className="px-4 py-4 text-[15px] text-muted-foreground">Nada para ajustar nesta função.</p>}
            </Group>
            <PrimaryButton className="w-full" onClick={save} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar permissões</PrimaryButton>
        </div>
    )
}
