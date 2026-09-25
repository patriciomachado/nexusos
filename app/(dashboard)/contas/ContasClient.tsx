'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Check, Loader2, MessageCircle, Plus, Repeat, Search, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import Segmented from '@/components/ui/Segmented'
import Sheet from '@/components/tasks/Sheet'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, SwitchRow, TextInput, brl, moneyText, parseMoney } from '@/components/ui/form'
import { Amount, PrivacyProvider, PrivacyToggle } from '@/components/dashboard/Privacy'
import { MoneyField, send } from '@/components/cash/CashSheets'
import { cn } from '@/lib/utils'

/**
 * Contas a pagar (bills with due dates, monthly ones repeat by themselves)
 * and contas a receber (fiado, crediário, OS to pay later).
 */

interface Bill {
    id: string
    description: string
    amount: number | string
    due_date: string
    repeat_monthly: boolean
    status: 'open' | 'paid' | 'cancelled'
    paid_at: string | null
    paid_amount: number | string | null
    paid_from: 'cash' | 'bank' | null
}

interface Receivable {
    id: string
    amount: number | string
    due_date: string | null
    installments: number | null
    notes: string | null
    created_at: string
    customer_id: string | null
    service_order_id: string | null
    customers: { name?: string; phone?: string } | null
    service_orders: { order_number?: string } | null
}

type Method = { id: string; name: string; code: string }

const today = () => new Date().toLocaleDateString('sv-SE')
const addDays = (day: string, n: number) => {
    const d = new Date(`${day}T12:00:00`)
    d.setDate(d.getDate() + n)
    return d.toLocaleDateString('sv-SE')
}
const daysBetween = (a: string, b: string) => Math.round((+new Date(`${b}T12:00:00`) - +new Date(`${a}T12:00:00`)) / 86_400_000)
function dueLabel(day: string | null) {
    if (!day) return 'sem vencimento'
    const t = today()
    const diff = daysBetween(t, day)
    if (diff === 0) return 'vence hoje'
    if (diff === 1) return 'vence amanhã'
    if (diff < 0) return `venceu há ${-diff} ${diff === -1 ? 'dia' : 'dias'}`
    if (diff < 7) return `vence ${new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' })}`
    return `vence ${new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`
}
const num = (v: unknown) => Number(v) || 0

export default function ContasClient({ initialTab }: { initialTab: 'pay' | 'receive' }) {
    const [tab, setTab] = useState(initialTab)
    return (
        <div className="min-h-full bg-background">
            <Header title="Contas" />
            <PrivacyProvider>
                <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 pb-16 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <Segmented
                            ariaLabel="Contas"
                            value={tab}
                            onChange={setTab}
                            options={[{ value: 'pay', label: 'A pagar' }, { value: 'receive', label: 'A receber' }]}
                        />
                        <PrivacyToggle />
                    </div>
                    {tab === 'pay' ? <BillsTab /> : <ReceivablesTab />}
                </div>
            </PrivacyProvider>
        </div>
    )
}

/* ─────────────────────────────── A pagar ─────────────────────────────── */

function BillsTab() {
    const [bills, setBills] = useState<Bill[]>([])
    const [loading, setLoading] = useState(true)
    const [missing, setMissing] = useState(false)
    const [editing, setEditing] = useState<Bill | 'new' | null>(null)
    const [showPaid, setShowPaid] = useState(false)

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/bills', { cache: 'no-store' })
            const d = await res.json()
            if (d.code === 'MIGRATION') { setMissing(true); return }
            setBills(Array.isArray(d.data) ? d.data : [])
        } catch {
            toast.error('Não foi possível carregar as contas')
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { load() }, [load])

    const t = today()
    const open = bills.filter(b => b.status === 'open')
    const groups = useMemo(() => [
        { key: 'late', title: 'Vencidas', items: open.filter(b => b.due_date < t) },
        { key: 'week', title: 'Próximos 7 dias', items: open.filter(b => b.due_date >= t && b.due_date <= addDays(t, 7)) },
        { key: 'later', title: 'Depois', items: open.filter(b => b.due_date > addDays(t, 7)) },
    ].filter(g => g.items.length), [open, t])
    const paid = bills.filter(b => b.status === 'paid').sort((a, b) => String(b.paid_at).localeCompare(String(a.paid_at)))
    const total = (xs: Bill[]) => xs.reduce((s, b) => s + num(b.amount), 0)
    const late = open.filter(b => b.due_date < t)
    const thisMonth = open.filter(b => b.due_date <= addDays(t, 30))

    if (missing) return <MigrationNotice />

    return (
        <div className="space-y-4">
            <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                <div className="p-4">
                    <p className="text-[15px] font-medium text-muted-foreground">A pagar nos próximos 30 dias</p>
                    <p className="mt-0.5 text-[34px] leading-tight font-semibold tracking-tight"><Amount value={total(thisMonth)} /></p>
                    <p className="text-[15px] text-muted-foreground">{thisMonth.length} {thisMonth.length === 1 ? 'conta' : 'contas'}{late.length > 0 && <> · <span className="text-red-600 dark:text-red-400 font-medium">{late.length} vencida{late.length > 1 ? 's' : ''} (<Amount value={total(late)} plain />)</span></>}</p>
                </div>
            </section>

            <PrimaryButton className="w-full" onClick={() => setEditing('new')}><Plus className="w-5 h-5" /> Nova conta</PrimaryButton>

            {loading ? (
                <div className="h-48 rounded-2xl bg-card border border-border/60 animate-pulse" />
            ) : !open.length ? (
                <p className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-[15px] text-muted-foreground">Nenhuma conta em aberto. Cadastre aluguel, internet, fornecedores… e o app avisa no “Seu dia” quando vencer.</p>
            ) : groups.map(g => (
                <section key={g.key} className="space-y-1.5">
                    <div className="flex items-end justify-between px-4">
                        <h2 className={cn('text-[13px] font-medium', g.key === 'late' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{g.title}</h2>
                        <span className="text-[13px] text-muted-foreground tabular-nums"><Amount value={total(g.items)} plain /></span>
                    </div>
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {g.items.map(b => (
                            <li key={b.id}>
                                <button type="button" onClick={() => setEditing(b)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]">
                                    <span className="flex-1 min-w-0">
                                        <span className="flex items-center gap-1.5 text-[15px] font-medium"><span className="truncate">{b.description}</span>{b.repeat_monthly && <Repeat className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="Todo mês" />}</span>
                                        <span className={cn('block text-[13px]', b.due_date < t ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{dueLabel(b.due_date)}</span>
                                    </span>
                                    <span className="text-[15px] font-semibold tabular-nums shrink-0"><Amount value={num(b.amount)} plain /></span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            {paid.length > 0 && (
                <section className="space-y-1.5">
                    <button type="button" onClick={() => setShowPaid(v => !v)} className="px-4 text-[13px] font-medium text-primary">
                        {showPaid ? 'Esconder pagas' : `Ver pagas nos últimos 60 dias (${paid.length})`}
                    </button>
                    {showPaid && (
                        <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                            {paid.map(b => (
                                <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[15px] truncate">{b.description}</span>
                                        <span className="block text-[13px] text-muted-foreground">Paga {b.paid_at ? new Date(b.paid_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : ''} · {b.paid_from === 'cash' ? 'pelo caixa' : 'pelo banco'}</span>
                                    </span>
                                    <span className="text-[15px] tabular-nums text-muted-foreground"><Amount value={num(b.paid_amount ?? b.amount)} plain /></span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            <BillSheet bill={editing} onClose={() => setEditing(null)} onDone={load} />
        </div>
    )
}

function BillSheet({ bill, onClose, onDone }: { bill: Bill | 'new' | null; onClose: () => void; onDone: () => void }) {
    const isNew = bill === 'new'
    const current = bill && bill !== 'new' ? bill : null
    const [description, setDescription] = useState('')
    const [value, setValue] = useState('')
    const [due, setDue] = useState(today())
    const [repeat, setRepeat] = useState(false)
    const [busy, setBusy] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (!bill) return
        setConfirmDelete(false)
        if (bill === 'new') { setDescription(''); setValue(''); setDue(today()); setRepeat(false) }
        else { setDescription(bill.description); setValue(moneyText(num(bill.amount))); setDue(bill.due_date); setRepeat(bill.repeat_monthly) }
    }, [bill])

    if (!bill) return null

    const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
        setBusy(key)
        try {
            await fn()
            toast.success(ok)
            onDone()
            onClose()
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setBusy(null)
        }
    }
    const payload = () => ({ description: description.trim(), amount: parseMoney(value), due_date: due, repeat_monthly: repeat })
    const valid = () => {
        if (!description.trim()) { toast.error('Diga que conta é.'); return false }
        if (parseMoney(value) <= 0) { toast.error('Informe o valor.'); return false }
        if (!due) { toast.error('Informe o vencimento.'); return false }
        return true
    }
    const changed = current && (description.trim() !== current.description || parseMoney(value) !== num(current.amount) || due !== current.due_date || repeat !== current.repeat_monthly)

    const pay = (from: 'cash' | 'bank') => run(from, async () => {
        if (changed) await send(`/api/bills/${current!.id}`, 'PATCH', payload())
        const r = await send(`/api/bills/${current!.id}/pay`, 'POST', { from, amount: parseMoney(value) })
        if (r.next) toast.message(`Próxima: ${new Date(`${r.next.due_date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`)
    }, from === 'cash' ? 'Paga com o dinheiro do caixa' : 'Marcada como paga pelo banco')

    return (
        <Sheet
            open
            onClose={onClose}
            title={isNew ? 'Nova conta a pagar' : current!.description}
            subtitle={current ? `${brl(num(current.amount))} · ${dueLabel(current.due_date)}` : undefined}
            footer={isNew ? (
                <PrimaryButton className="w-full" disabled={!!busy} onClick={() => valid() && run('save', () => send('/api/bills', 'POST', payload()), 'Conta cadastrada')}>
                    {busy === 'save' && <Loader2 className="w-5 h-5 animate-spin" />}Salvar conta
                </PrimaryButton>
            ) : confirmDelete ? (
                <>
                    <SecondaryButton onClick={() => setConfirmDelete(false)}>Voltar</SecondaryButton>
                    <PrimaryButton className="flex-1 bg-red-600" disabled={!!busy} onClick={() => run('del', () => send(`/api/bills/${current!.id}`, 'DELETE'), 'Conta apagada')}>
                        {busy === 'del' && <Loader2 className="w-5 h-5 animate-spin" />}Apagar conta
                    </PrimaryButton>
                </>
            ) : (
                <div className="w-full space-y-2">
                    <div className="flex gap-2">
                        <PrimaryButton className="flex-1 px-3 text-[16px]" disabled={!!busy} onClick={() => valid() && pay('cash')}>{busy === 'cash' && <Loader2 className="w-5 h-5 animate-spin" />}Pagar do caixa</PrimaryButton>
                        <SecondaryButton className="flex-1 px-3 text-[16px]" disabled={!!busy} onClick={() => valid() && pay('bank')}>{busy === 'bank' && <Loader2 className="w-5 h-5 animate-spin" />}Paguei no banco</SecondaryButton>
                    </div>
                    <div className="flex gap-2">
                        {changed && <SecondaryButton className="flex-1" disabled={!!busy} onClick={() => valid() && run('save', () => send(`/api/bills/${current!.id}`, 'PATCH', payload()), 'Conta atualizada')}>Salvar alterações</SecondaryButton>}
                        <SecondaryButton className={cn('text-red-600 dark:text-red-400', !changed && 'flex-1')} onClick={() => setConfirmDelete(true)} aria-label="Apagar"><Trash2 className="w-5 h-5" />{!changed && ' Apagar'}</SecondaryButton>
                    </div>
                </div>
            )}
        >
            <div className="space-y-4">
                {!isNew && <div tabIndex={-1} data-autofocus className="outline-none" aria-hidden />}
                <Group>
                    <Field label="Conta" htmlFor="bill-desc">
                        <TextInput id="bill-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Aluguel, Internet, Fornecedor X" data-autofocus={isNew || undefined} />
                    </Field>
                    <Field label="Valor (R$)" htmlFor="bill-amount">
                        <TextInput id="bill-amount" inputMode="decimal" value={value} onChange={e => setValue(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" />
                    </Field>
                    <Field label="Vencimento" htmlFor="bill-due">
                        <TextInput id="bill-due" type="date" value={due} onChange={e => setDue(e.target.value)} />
                    </Field>
                </Group>
                <Group footer="Ao pagar, a do mês seguinte é criada sozinha.">
                    <SwitchRow label="Repete todo mês" checked={repeat} onChange={setRepeat} />
                </Group>
                {!isNew && !confirmDelete && (
                    <p className="px-1 text-[13px] text-muted-foreground">“Pagar do caixa” tira o dinheiro do caixa aberto. “Paguei no banco” só registra a despesa (aparece nos relatórios).</p>
                )}
                {confirmDelete && <p className="px-1 text-[15px] text-red-600 dark:text-red-400">A conta sai da lista{current?.repeat_monthly ? ' e deixa de se repetir' : ''}.</p>}
            </div>
        </Sheet>
    )
}

/* ────────────────────────────── A receber ────────────────────────────── */

function ReceivablesTab() {
    const [items, setItems] = useState<Receivable[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<Receivable | null>(null)
    const [creating, setCreating] = useState(false)
    const [query, setQuery] = useState('')

    const load = useCallback(async () => {
        try {
            const d = await fetch('/api/receivables', { cache: 'no-store' }).then(r => r.json())
            setItems(Array.isArray(d.data) ? d.data : [])
        } catch {
            toast.error('Não foi possível carregar')
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { load() }, [load])

    const t = today()
    const q = query.trim().toLowerCase()
    const shown = items.filter(i => !q || `${i.customers?.name ?? ''} ${i.notes ?? ''} ${i.service_orders?.order_number ?? ''}`.toLowerCase().includes(q))
    const groups = [
        { key: 'late', title: 'Atrasadas', items: shown.filter(i => i.due_date && i.due_date < t) },
        { key: 'soon', title: 'Próximos 30 dias', items: shown.filter(i => i.due_date && i.due_date >= t && i.due_date <= addDays(t, 30)) },
        { key: 'later', title: 'Depois', items: shown.filter(i => i.due_date && i.due_date > addDays(t, 30)) },
        { key: 'none', title: 'Sem vencimento', items: shown.filter(i => !i.due_date) },
    ].filter(g => g.items.length)
    const total = (xs: Receivable[]) => xs.reduce((s, i) => s + num(i.amount), 0)
    const late = items.filter(i => i.due_date && i.due_date < t)

    return (
        <div className="space-y-4">
            <section className="rounded-2xl bg-card border border-border/60 p-4">
                <p className="text-[15px] font-medium text-muted-foreground">A receber de clientes</p>
                <p className="mt-0.5 text-[34px] leading-tight font-semibold tracking-tight"><Amount value={total(items)} /></p>
                <p className="text-[15px] text-muted-foreground">{items.length} {items.length === 1 ? 'conta' : 'contas'}{late.length > 0 && <> · <span className="text-red-600 dark:text-red-400 font-medium">{late.length} atrasada{late.length > 1 ? 's' : ''} (<Amount value={total(late)} plain />)</span></>}</p>
            </section>

            <PrimaryButton className="w-full" onClick={() => setCreating(true)}><Plus className="w-5 h-5" /> Novo fiado</PrimaryButton>

            {items.length > 5 && (
                <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-foreground/[0.06]">
                    <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente" className="flex-1 min-w-0 bg-transparent text-[17px] outline-none" />
                </label>
            )}

            {loading ? (
                <div className="h-48 rounded-2xl bg-card border border-border/60 animate-pulse" />
            ) : !groups.length ? (
                <p className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-[15px] text-muted-foreground">Ninguém devendo. Vendas no crediário, OS “pagar depois” e fiados aparecem aqui.</p>
            ) : groups.map(g => (
                <section key={g.key} className="space-y-1.5">
                    <div className="flex items-end justify-between px-4">
                        <h2 className={cn('text-[13px] font-medium', g.key === 'late' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{g.title}</h2>
                        <span className="text-[13px] text-muted-foreground tabular-nums"><Amount value={total(g.items)} plain /></span>
                    </div>
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {g.items.map(i => (
                            <li key={i.id}>
                                <button type="button" onClick={() => setSelected(i)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]">
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[15px] font-medium truncate">{i.customers?.name ?? 'Cliente'}</span>
                                        <span className={cn('block text-[13px] truncate', g.key === 'late' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                                            {dueLabel(i.due_date)}{i.service_orders?.order_number ? ` · OS ${i.service_orders.order_number}` : ''}{i.notes ? ` · ${i.notes}` : ''}
                                        </span>
                                    </span>
                                    <span className="text-[15px] font-semibold tabular-nums shrink-0"><Amount value={num(i.amount)} plain /></span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            <ReceivableSheet item={selected} onClose={() => setSelected(null)} onDone={load} />
            <NewCreditSheet open={creating} onClose={() => setCreating(false)} onDone={load} />
        </div>
    )
}

function ReceivableSheet({ item, onClose, onDone }: { item: Receivable | null; onClose: () => void; onDone: () => void }) {
    const [methods, setMethods] = useState<Method[]>([])
    const [methodId, setMethodId] = useState('')
    const [due, setDue] = useState('')
    const [busy, setBusy] = useState<string | null>(null)
    const [confirmCancel, setConfirmCancel] = useState(false)

    useEffect(() => {
        if (!item) return
        setDue(item.due_date ?? '')
        setConfirmCancel(false)
        fetch('/api/payment-methods').then(r => r.json()).then((d: Method[]) => {
            if (!Array.isArray(d)) return
            const order = ['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD']
            const rank = (m: Method) => { const i = order.indexOf(m.code); return i < 0 ? 99 : i }
            const list = d.filter(m => m.code !== 'INSTALLMENT').sort((a, b) => rank(a) - rank(b))
            setMethods(list)
            setMethodId(list[0]?.id ?? '')
        }).catch(() => {})
    }, [item])

    if (!item) return null
    const name = item.customers?.name ?? 'Cliente'

    const receive = async () => {
        setBusy('receive')
        try {
            const r = await send(`/api/receivables/${item.id}/receive`, 'POST', { payment_method_id: methodId })
            toast.success(r.in_register ? 'Recebido e lançado no caixa' : 'Recebido (nenhum caixa aberto, não entrou no caixa)')
            onDone(); onClose()
        } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
    }
    const charge = async () => {
        setBusy('charge')
        try {
            const r = await send(`/api/receivables/${item.id}/charge`, 'POST')
            if (r.sent) toast.success(`Lembrete enviado para ${name.split(' ')[0]} no WhatsApp`)
            else if (r.url) window.open(r.url, '_blank')
        } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
    }
    const saveDue = async () => {
        setBusy('due')
        try {
            await send(`/api/receivables/${item.id}`, 'PATCH', { due_date: due })
            toast.success('Vencimento alterado')
            onDone(); onClose()
        } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
    }
    const cancel = async () => {
        setBusy('cancel')
        try {
            await send(`/api/receivables/${item.id}`, 'DELETE')
            toast.success('Conta cancelada')
            onDone(); onClose()
        } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
    }
    const late = item.due_date && item.due_date < today()

    return (
        <Sheet
            open
            onClose={onClose}
            title={name}
            subtitle={`${brl(num(item.amount))} · ${dueLabel(item.due_date)}`}
            footer={confirmCancel ? (
                <>
                    <SecondaryButton onClick={() => setConfirmCancel(false)}>Voltar</SecondaryButton>
                    <PrimaryButton className="flex-1 bg-red-600" disabled={!!busy} onClick={cancel}>{busy === 'cancel' && <Loader2 className="w-5 h-5 animate-spin" />}Cancelar conta</PrimaryButton>
                </>
            ) : (
                <PrimaryButton className="w-full" disabled={!!busy || !methodId} onClick={receive}>{busy === 'receive' && <Loader2 className="w-5 h-5 animate-spin" />}Recebi {brl(num(item.amount))}</PrimaryButton>
            )}
        >
            <div className="space-y-5">
                <div tabIndex={-1} data-autofocus className="outline-none" aria-hidden />
                {late && (
                    <p className="flex items-center gap-2 rounded-2xl bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 text-[15px]"><AlertTriangle className="w-4 h-4 shrink-0" /> {dueLabel(item.due_date)}</p>
                )}
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-muted-foreground">Recebeu como?</p>
                    <Chips ariaLabel="Forma" options={methods.map(m => ({ value: m.id, label: m.name }))} value={methodId} onChange={setMethodId} />
                    <p className="px-1 text-[13px] text-muted-foreground">Entra no seu caixa aberto e conta como faturamento de hoje.</p>
                </div>

                <button type="button" onClick={charge} disabled={!!busy} className="w-full h-12 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-[17px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    {busy === 'charge' ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />} Cobrar no WhatsApp
                </button>
                {!item.customers?.phone && <p className="-mt-3 px-1 text-[13px] text-muted-foreground">O cliente não tem WhatsApp no cadastro.</p>}

                <Group>
                    <Field label="Vencimento" htmlFor="rc-due">
                        <TextInput id="rc-due" type="date" value={due} onChange={e => setDue(e.target.value)} />
                    </Field>
                    {due && due !== (item.due_date ?? '') && (
                        <button type="button" onClick={saveDue} disabled={!!busy} className="w-full px-4 min-h-[48px] text-left text-[17px] text-primary">Salvar novo vencimento</button>
                    )}
                </Group>
                {!confirmCancel && <button type="button" onClick={() => setConfirmCancel(true)} className="px-1 text-[15px] text-red-600 dark:text-red-400">Cancelar esta conta</button>}
            </div>
        </Sheet>
    )
}

function NewCreditSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
    const [customers, setCustomers] = useState<{ id: string; name: string; phone?: string }[]>([])
    const [search, setSearch] = useState('')
    const [customerId, setCustomerId] = useState('')
    const [value, setValue] = useState('')
    const [count, setCount] = useState('1')
    const [first, setFirst] = useState(addDays(today(), 30))
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setSearch(''); setCustomerId(''); setValue(''); setCount('1'); setFirst(addDays(today(), 30)); setNote('')
    }, [open])

    useEffect(() => {
        if (!open) return
        const h = setTimeout(() => {
            fetch(`/api/customers${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`).then(r => r.json()).then(d => setCustomers(Array.isArray(d.data) ? d.data : [])).catch(() => {})
        }, 250)
        return () => clearTimeout(h)
    }, [open, search])

    const chosen = customers.find(c => c.id === customerId)
    const n = Math.min(Math.max(Number(count) || 1, 1), 24)
    const total = parseMoney(value)

    const save = async () => {
        if (!customerId) return toast.error('Escolha o cliente.')
        if (total <= 0) return toast.error('Informe o valor.')
        setSaving(true)
        try {
            await send('/api/receivables', 'POST', { customer_id: customerId, amount: total, installments: n, first_due: first, notes: note })
            toast.success(n > 1 ? `Fiado em ${n} parcelas cadastrado` : 'Fiado cadastrado')
            onDone(); onClose()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Novo fiado"
            subtitle="Algo que o cliente vai pagar depois"
            footer={<PrimaryButton className="w-full" onClick={save} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Cadastrar</PrimaryButton>}
        >
            <div className="space-y-5">
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-muted-foreground">Cliente</p>
                    {chosen ? (
                        <div className="flex items-center justify-between rounded-2xl bg-card border border-border/60 px-4 min-h-[52px]">
                            <span className="text-[17px] font-medium">{chosen.name}</span>
                            <button type="button" onClick={() => setCustomerId('')} className="text-[15px] text-primary">Trocar</button>
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                            <label className="flex items-center gap-2 px-4 h-12 border-b border-border/60">
                                <Search className="w-[18px] h-[18px] text-muted-foreground" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente" className="flex-1 min-w-0 bg-transparent text-[17px] outline-none" data-autofocus />
                            </label>
                            <ul className="max-h-48 overflow-y-auto divide-y divide-border/60">
                                {customers.slice(0, 30).map(c => (
                                    <li key={c.id}><button type="button" onClick={() => setCustomerId(c.id)} className="w-full text-left px-4 py-2.5 text-[16px] hover:bg-foreground/[0.03]">{c.name}</button></li>
                                ))}
                                {!customers.length && <li className="px-4 py-3 text-[15px] text-muted-foreground">Nenhum cliente encontrado.</li>}
                            </ul>
                        </div>
                    )}
                </div>

                <MoneyField label="Valor total" value={value} onChange={setValue} />

                <Group footer={n > 1 && total > 0 ? `${n}× de ${brl(Math.floor((total / n) * 100) / 100)}, uma por mês.` : undefined}>
                    <Field label="Parcelas" htmlFor="nc-count">
                        <TextInput id="nc-count" inputMode="numeric" value={count} onChange={e => setCount(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                    </Field>
                    <Field label={n > 1 ? 'Primeiro vencimento' : 'Vencimento'} htmlFor="nc-first">
                        <TextInput id="nc-first" type="date" value={first} onChange={e => setFirst(e.target.value)} />
                    </Field>
                    <Field label="O que foi (opcional)" htmlFor="nc-note">
                        <TextInput id="nc-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: capinha + película" />
                    </Field>
                </Group>
            </div>
        </Sheet>
    )
}

function MigrationNotice() {
    return (
        <div className="rounded-2xl bg-orange-500/10 text-orange-800 dark:text-orange-300 p-4 text-[15px] space-y-1">
            <p className="font-semibold">Falta atualizar o banco de dados</p>
            <p>Rode no Supabase o arquivo <code className="font-mono text-[13px]">supabase/migrations/20260930_caixa_contas.sql</code> para ativar as contas a pagar.</p>
        </div>
    )
}
