'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import Segmented from '@/components/ui/Segmented'
import Sheet from '@/components/tasks/Sheet'
import { PrimaryButton, SecondaryButton, brl } from '@/components/ui/form'
import { Amount } from '@/components/dashboard/Privacy'
import { TransactionSheet } from './CashSheets'
import TxRow from './TxRow'
import { type CashTx, cleanDescription, dayLabel, isCostRecord, num, sourceLabel, timeOf } from './cash-utils'
import { cn } from '@/lib/utils'

interface Register {
    id: string
    opened_at: string
    closed_at?: string | null
    opening_balance: number | string
    closing_balance?: number | string | null
    status: 'open' | 'closed'
    users?: { full_name?: string } | null
}

type Payment = {
    id: string
    amount: number | string
    created_at: string
    payment_date?: string | null
    payment_method?: string | null
    reference_id?: string | null
    service_order_id?: string | null
    sale_id?: string | null
    customers?: { name?: string } | null
    service_orders?: { order_number?: string } | null
}

function monthKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * History of the cash: month summary, every movement grouped by day, and the
 * past closings. Payments that never went through a cash register (older
 * records) are merged in so the month total matches what was received.
 */
export default function TransactionHistory({ registers, onChanged }: { registers: Register[]; onChanged: () => void }) {
    const [txs, setTxs] = useState<CashTx[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [month, setMonth] = useState(() => monthKey(new Date()))
    const [type, setType] = useState<'all' | 'entry' | 'exit'>('all')
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState<CashTx | null>(null)
    const [deleting, setDeleting] = useState<Register | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        let alive = true
        Promise.all([
            fetch('/api/cash-transactions', { cache: 'no-store' }).then(r => r.json()),
            fetch('/api/payments', { cache: 'no-store' }).then(r => r.json()),
        ]).then(([t, p]) => {
            if (!alive) return
            setTxs(Array.isArray(t?.data) ? t.data : Array.isArray(t) ? t : [])
            setPayments(Array.isArray(p?.data) ? p.data : [])
        }).catch(() => toast.error('Não foi possível carregar o histórico'))
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [])

    // Cash movements + payments that have no matching movement (same source and amount, or same amount within 5s).
    const all = useMemo<CashTx[]>(() => {
        const extra = payments.filter(p => {
            const src = p.reference_id || p.service_order_id || p.sale_id || p.id
            return !txs.some(tx =>
                num(tx.amount) === num(p.amount) &&
                (tx.source_id === src || Math.abs(+new Date(tx.created_at) - +new Date(p.created_at)) < 5000))
        }).map<CashTx>(p => ({
            id: `pay-${p.id}`,
            cash_register_id: '',
            type: 'entry',
            amount: p.amount,
            created_at: p.payment_date || p.created_at,
            source_type: 'payment',
            source_id: p.reference_id || p.service_order_id || p.id,
            description: `Pagamento de ${p.customers?.name || 'cliente'}${p.service_orders?.order_number ? ` · OS ${p.service_orders.order_number}` : ''}`,
            payment_methods: { name: p.payment_method || 'Pagamento' },
        }))
        return [...txs, ...extra].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    }, [txs, payments])

    const inMonth = useMemo(() => all.filter(t => month === 'all' || monthKey(new Date(t.created_at)) === month), [all, month])

    const m = useMemo(() => {
        let revenue = 0, supply = 0, expenses = 0, withdrawals = 0, costs = 0
        const seen = new Set<string>()
        for (const t of inMonth) {
            const a = num(t.amount)
            const src = t.source_type
            if (t.type === 'entry') {
                if (src === 'service_order' || src === 'product_sale' || src === 'payment') {
                    revenue += a
                    const key = t.source_id || t.id
                    if (!seen.has(key)) {
                        seen.add(key)
                        costs += num(t.service_orders?.parts_cost ?? t.sales?.total_cost ?? 0)
                    }
                } else supply += a
            } else if (!isCostRecord(t)) {
                if (src === 'manual_sangria') withdrawals += a
                else expenses += a
            }
        }
        const net = revenue - costs - expenses
        return { revenue, supply, expenses, withdrawals, costs, net, margin: revenue > 0 ? net / revenue : null }
    }, [inMonth])

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        return inMonth.filter(t =>
            (type === 'all' || t.type === type) &&
            (!q || `${cleanDescription(t)} ${sourceLabel(t)} ${t.payment_methods?.name ?? ''}`.toLowerCase().includes(q)))
    }, [inMonth, type, query])

    const days = useMemo(() => {
        const groups: { label: string; items: CashTx[]; total: number }[] = []
        for (const t of shown.slice(0, 400)) {
            const label = dayLabel(t.created_at)
            let g = groups[groups.length - 1]
            if (!g || g.label !== label) { g = { label, items: [], total: 0 }; groups.push(g) }
            g.items.push(t)
            if (!isCostRecord(t)) g.total += t.type === 'entry' ? num(t.amount) : -num(t.amount)
        }
        return groups
    }, [shown])

    const months = useMemo(() => {
        const now = new Date()
        return Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            return { value: monthKey(d), label: label.charAt(0).toUpperCase() + label.slice(1), short: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') }
        })
    }, [])

    const openIds = new Set(registers.filter(r => r.status === 'open').map(r => r.id))
    const closings = registers.filter(r => r.status === 'closed' && (month === 'all' || monthKey(new Date(r.opened_at)) === month))

    const deleteRegister = async () => {
        if (!deleting) return
        setBusy(true)
        try {
            const res = await fetch(`/api/cash-registers/${deleting.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Não foi possível apagar.')
            toast.success('Fechamento apagado')
            setDeleting(null)
            onChanged()
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {months.slice(0, 3).map(o => (
                    <Pill key={o.value} on={month === o.value} onClick={() => setMonth(o.value)}>{o.short}</Pill>
                ))}
                <label className={cn('relative shrink-0 h-9 pl-3.5 pr-8 rounded-full text-[15px] font-medium flex items-center',
                    month === 'all' || months.slice(3).some(o => o.value === month) ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06]')}>
                    {month === 'all' ? 'Tudo' : months.slice(3).find(o => o.value === month)?.label ?? 'Outro mês'}
                    <span aria-hidden className="absolute right-3 text-[11px]">▼</span>
                    <select
                        aria-label="Escolher mês"
                        value={month}
                        onChange={e => setMonth(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer text-[17px]"
                    >
                        {months.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        <option value="all">Tudo</option>
                    </select>
                </label>
            </div>

            <section aria-label="Resumo do período" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Tile label="Faturamento" foot={`${inMonth.filter(t => t.type === 'entry' && ['service_order', 'product_sale', 'payment'].includes(t.source_type ?? '')).length} recebimentos`}><Amount value={m.revenue} /></Tile>
                <Tile label="Lucro líquido" foot={m.margin == null ? 'sem faturamento' : `margem de ${(m.margin * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}><Amount value={m.net} /></Tile>
                <Tile label="Custo de peças e produtos"><Amount value={m.costs} /></Tile>
                <Tile label="Despesas" foot={m.withdrawals > 0 ? <>Sangrias: <Amount value={m.withdrawals} plain /></> : undefined}><Amount value={m.expenses} /></Tile>
            </section>

            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:items-start">
                <section aria-labelledby="hist-title" className="space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <h2 id="hist-title" className="text-[20px] font-semibold tracking-tight">Movimentações</h2>
                        <Segmented className="ml-auto" size="sm" ariaLabel="Tipo" value={type} onChange={setType}
                            options={[{ value: 'all', label: 'Todas' }, { value: 'entry', label: 'Entradas' }, { value: 'exit', label: 'Saídas' }]} />
                    </div>
                    <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-foreground/[0.06]">
                        <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                        <input
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Buscar cliente, descrição, forma…"
                            className="flex-1 min-w-0 bg-transparent text-[17px] outline-none placeholder:text-muted-foreground/70"
                        />
                    </label>

                    {loading ? (
                        <div className="h-64 rounded-2xl bg-card border border-border/60 animate-pulse" />
                    ) : days.length === 0 ? (
                        <p className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-[15px] text-muted-foreground">Nada encontrado neste período.</p>
                    ) : days.map(g => (
                        <div key={g.label} className="space-y-1.5">
                            <div className="flex items-end justify-between px-4">
                                <h3 className="text-[13px] font-medium text-muted-foreground">{g.label}</h3>
                                <span className="text-[13px] text-muted-foreground tabular-nums">{g.total >= 0 ? '+' : '−'}<Amount value={Math.abs(g.total)} plain /></span>
                            </div>
                            <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                                {g.items.map(t => <li key={t.id}><TxRow tx={t} onClick={() => setSelected(t)} /></li>)}
                            </ul>
                        </div>
                    ))}
                    {shown.length > 400 && <p className="px-4 text-[13px] text-muted-foreground">Mostrando as 400 mais recentes. Use a busca ou escolha um mês.</p>}
                </section>

                <aside aria-labelledby="closings-h" className="space-y-2 mt-4 lg:mt-0 min-w-0">
                    <h2 id="closings-h" className="px-1 text-[20px] font-semibold tracking-tight">Fechamentos</h2>
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {closings.length ? closings.map(r => (
                            <li key={r.id} className="flex items-center gap-3 pl-4 pr-2 py-3">
                                <Wallet className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15px] font-medium truncate">{new Date(r.opened_at).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    <span className="block text-[13px] text-muted-foreground truncate">
                                        {timeOf(r.opened_at)}–{r.closed_at ? timeOf(r.closed_at) : '…'} · abriu com <Amount value={num(r.opening_balance)} plain />
                                        {r.users?.full_name ? ` · ${r.users.full_name}` : ''}
                                    </span>
                                </span>
                                <span className="text-[15px] font-medium tabular-nums shrink-0"><Amount value={num(r.closing_balance)} plain /></span>
                                <button type="button" onClick={() => setDeleting(r)} aria-label="Apagar fechamento" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-500/10 shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </li>
                        )) : (
                            <li className="px-4 py-6 text-center text-[15px] text-muted-foreground">Nenhum fechamento neste período.</li>
                        )}
                    </ul>
                    <p className="px-4 text-[13px] text-muted-foreground">
                        Lucro líquido = faturamento − custo de peças e produtos − despesas. Suprimentos e sangrias só movem dinheiro e não contam como lucro ou despesa.
                    </p>
                </aside>
            </div>

            <TransactionSheet tx={selected} onClose={() => setSelected(null)} onDone={onChanged} editable={!!selected && openIds.has(selected.cash_register_id)} />

            <Sheet
                open={!!deleting}
                onClose={() => setDeleting(null)}
                title="Apagar fechamento?"
                footer={<>
                    <SecondaryButton onClick={() => setDeleting(null)} disabled={busy}>Cancelar</SecondaryButton>
                    <PrimaryButton className="flex-1 bg-red-600" onClick={deleteRegister} disabled={busy}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Apagar</PrimaryButton>
                </>}
            >
                {deleting && (
                    <p className="text-[17px]">
                        O caixa de {new Date(deleting.opened_at).toLocaleDateString('pt-BR')} ({brl(num(deleting.closing_balance))}) e <strong>todas as movimentações dele</strong> serão apagados. Os relatórios deixam de contar essas vendas. Não dá para desfazer.
                    </p>
                )}
            </Sheet>
        </div>
    )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium capitalize transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}>
            {children}
        </button>
    )
}

function Tile({ label, foot, children }: { label: string; foot?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 p-4 min-w-0">
            <p className="text-[13px] text-muted-foreground truncate">{label}</p>
            <p className="mt-0.5 text-[24px] leading-tight font-semibold tracking-tight truncate">{children}</p>
            {foot && <p className="mt-1 text-[13px] text-muted-foreground truncate">{foot}</p>}
        </div>
    )
}
