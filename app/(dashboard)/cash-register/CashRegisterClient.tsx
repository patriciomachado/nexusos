'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, ChevronRight, Lock, Minus, Plus, RefreshCw, Unlock, Wallet } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import Segmented from '@/components/ui/Segmented'
import { PrimaryButton, brl } from '@/components/ui/form'
import { Amount, PrivacyProvider, PrivacyToggle, PrivateBlock } from '@/components/dashboard/Privacy'
import VizScope from '@/components/reports/VizScope'
import { CloseCashSheet, MovementSheet, OpenCashSheet, TransactionSheet } from '@/components/cash/CashSheets'
import TransactionHistory from '@/components/cash/TransactionHistory'
import RecurringExpensesModal from '@/components/financeiro/RecurringExpensesModal'
import TxRow from '@/components/cash/TxRow'
import { type CashTx, METHOD_GROUPS, drawerCash, methodGroup, num, timeOf } from '@/components/cash/cash-utils'
import { cn, getLocalDateString } from '@/lib/utils'

interface Register {
    id: string
    opened_at: string
    closed_at?: string | null
    opening_balance: number | string
    closing_balance?: number | string | null
    status: 'open' | 'closed'
    users?: { full_name?: string } | null
}

async function getJson(url: string) {
    const res = await fetch(url, { cache: 'no-store' })
    return res.json()
}
const list = (d: unknown): CashTx[] => (Array.isArray(d) ? d : Array.isArray((d as { data?: unknown })?.data) ? (d as { data: CashTx[] }).data : [])

export default function CashRegisterClient() {
    const [tab, setTab] = useState<'today' | 'history'>('today')
    const [register, setRegister] = useState<Register | null>(null)
    const [txs, setTxs] = useState<CashTx[]>([])
    const [registers, setRegisters] = useState<Register[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [filter, setFilter] = useState<'all' | 'entry' | 'exit'>('all')
    const [historyKey, setHistoryKey] = useState(0)

    const [openSheet, setOpenSheet] = useState(false)
    const [closeSheet, setCloseSheet] = useState(false)
    const [movement, setMovement] = useState<'entry' | 'exit' | null>(null)
    const [recurring, setRecurring] = useState(false)
    const [selected, setSelected] = useState<CashTx | null>(null)

    const load = useCallback(async () => {
        setRefreshing(true)
        try {
            const [cur, regs] = await Promise.all([getJson('/api/cash-registers/current'), getJson('/api/cash-registers')])
            const current: Register | null = cur && !cur.error && cur.id ? cur : null
            setRegister(current)
            setRegisters(Array.isArray(regs?.data) ? regs.data : [])
            const t = current
                ? await getJson(`/api/cash-transactions?cash_register_id=${current.id}`)
                : await getJson(`/api/cash-transactions?date=${getLocalDateString()}`)
            setTxs(list(t))
            setHistoryKey(k => k + 1)
        } catch {
            toast.error('Não foi possível carregar o caixa')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
         
        load()
    }, [load])

    const opening = num(register?.opening_balance)
    const s = useMemo(() => {
        let entries = 0, exits = 0, sales = 0
        const byMethod: Record<string, number> = { cash: 0, pix: 0, card: 0, other: 0 }
        for (const tx of txs) {
            const a = num(tx.amount)
            if (tx.type === 'entry') {
                entries += a
                if (tx.source_type === 'service_order' || tx.source_type === 'product_sale') {
                    sales += 1
                    byMethod[methodGroup(tx)] += a
                }
            } else {
                exits += a
            }
        }
        const received = Object.values(byMethod).reduce((x, y) => x + y, 0)
        return { entries, exits, sales, byMethod, received, balance: opening + entries - exits, drawer: drawerCash(opening, txs) }
    }, [txs, opening])

    const chart = useMemo(() => {
        if (!register) return []
        let bal = opening
        const pts = [{ t: timeOf(register.opened_at), v: bal }]
        for (const tx of [...txs].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))) {
            bal += tx.type === 'entry' ? num(tx.amount) : -num(tx.amount)
            pts.push({ t: timeOf(tx.created_at), v: bal })
        }
        return pts
    }, [register, txs, opening])

    const shown = txs.filter(t => filter === 'all' || t.type === filter)
    const lastClosed = registers.find(r => r.status === 'closed')

    return (
        <div className="min-h-full bg-background">
            <Header title="Caixa" />
            <PrivacyProvider>
                <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-4 pb-10 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <Segmented
                            ariaLabel="Ver"
                            value={tab}
                            onChange={setTab}
                            options={[{ value: 'today', label: 'Hoje' }, { value: 'history', label: 'Histórico' }]}
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={load}
                                aria-label="Atualizar"
                                className="w-10 h-10 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1] flex items-center justify-center"
                            >
                                <RefreshCw className={cn('w-[18px] h-[18px]', refreshing && 'animate-spin')} />
                            </button>
                            <PrivacyToggle />
                        </div>
                    </div>

                    {tab === 'history' ? (
                        <TransactionHistory key={historyKey} registers={registers} onChanged={load} />
                    ) : loading ? (
                        <div className="space-y-4" aria-busy>
                            <div className="h-48 rounded-2xl bg-card border border-border/60 animate-pulse" />
                            <div className="h-20 rounded-2xl bg-card border border-border/60 animate-pulse" />
                            <div className="h-64 rounded-2xl bg-card border border-border/60 animate-pulse" />
                        </div>
                    ) : (
                        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:items-start">
                            <div className="space-y-4 min-w-0">
                                {register ? (
                                    <section aria-labelledby="bal-title" className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                                        <div className="p-4 pb-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <h2 id="bal-title" className="text-[15px] font-medium text-muted-foreground">Saldo do caixa</h2>
                                                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aberto às {timeOf(register.opened_at)}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[36px] leading-tight font-semibold tracking-tight"><Amount value={s.balance} /></p>
                                            <p className="text-[15px] text-muted-foreground">
                                                Abertura <Amount value={opening} plain className="text-foreground font-medium" />
                                                <span> · {txs.length} {txs.length === 1 ? 'movimentação' : 'movimentações'}</span>
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-3 divide-x divide-border/60 border-t border-border/60">
                                            <Cell label="Entradas" tone="in"><Amount value={s.entries} plain /></Cell>
                                            <Cell label="Saídas" tone="out"><Amount value={s.exits} plain /></Cell>
                                            <Cell label="Na gaveta"><Amount value={s.drawer} plain /></Cell>
                                        </div>
                                    </section>
                                ) : (
                                    <section className="rounded-2xl bg-card border border-border/60 p-5 flex flex-col items-center text-center gap-3">
                                        <span className="w-14 h-14 rounded-full bg-foreground/[0.06] flex items-center justify-center"><Lock className="w-6 h-6 text-muted-foreground" /></span>
                                        <div>
                                            <h2 className="text-[20px] font-semibold">Caixa fechado</h2>
                                            <p className="text-[15px] text-muted-foreground mt-0.5">Abra o caixa para registrar as vendas e o dinheiro do dia.</p>
                                        </div>
                                        <PrimaryButton className="w-full sm:w-auto" onClick={() => setOpenSheet(true)}><Unlock className="w-5 h-5" /> Abrir caixa</PrimaryButton>
                                        {lastClosed && (
                                            <p className="text-[13px] text-muted-foreground">
                                                Último fechamento: {new Date(lastClosed.closed_at || lastClosed.opened_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                                                {' · '}<Amount value={num(lastClosed.closing_balance)} plain />
                                            </p>
                                        )}
                                    </section>
                                )}

                                <nav aria-label="Ações do caixa" className="grid grid-cols-4 gap-2">
                                    <Action label="Suprimento" disabled={!register} onClick={() => setMovement('entry')} className="text-emerald-600 dark:text-emerald-400"><Plus className="w-6 h-6" /></Action>
                                    <Action label="Sangria" disabled={!register} onClick={() => setMovement('exit')} className="text-red-600 dark:text-red-400"><Minus className="w-6 h-6" /></Action>
                                    <Action label="Contas fixas" onClick={() => setRecurring(true)} className="text-sky-600 dark:text-sky-400"><CalendarClock className="w-6 h-6" /></Action>
                                    {register
                                        ? <Action label="Fechar" onClick={() => setCloseSheet(true)} className="text-orange-600 dark:text-orange-400"><Lock className="w-6 h-6" /></Action>
                                        : <Action label="Abrir" onClick={() => setOpenSheet(true)} primary><Unlock className="w-6 h-6" /></Action>}
                                </nav>

                                {s.received > 0 && (
                                    <section aria-labelledby="methods-title" className="space-y-2">
                                        <h2 id="methods-title" className="px-1 text-[20px] font-semibold tracking-tight">Recebido por forma</h2>
                                        <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
                                            <div className="flex h-2.5 rounded-full overflow-hidden bg-foreground/[0.06]" aria-hidden>
                                                {METHOD_GROUPS.map(g => s.byMethod[g.key] > 0 && (
                                                    <span key={g.key} className={METHOD_COLOR[g.key]} style={{ width: `${(s.byMethod[g.key] / s.received) * 100}%` }} />
                                                ))}
                                            </div>
                                            <ul className="space-y-2">
                                                {METHOD_GROUPS.filter(g => s.byMethod[g.key] > 0).map(g => (
                                                    <li key={g.key} className="flex items-center gap-2 min-w-0">
                                                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', METHOD_COLOR[g.key])} />
                                                        <span className="text-[15px]">{g.label}</span>
                                                        <span className="text-[13px] text-muted-foreground tabular-nums">{Math.round((s.byMethod[g.key] / s.received) * 100)}%</span>
                                                        <span className="ml-auto text-[15px] font-medium tabular-nums"><Amount value={s.byMethod[g.key]} plain /></span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="text-[13px] text-muted-foreground">{s.sales} {s.sales === 1 ? 'venda ou OS paga' : 'vendas e OS pagas'} neste caixa.</p>
                                        </div>
                                    </section>
                                )}

                                <section aria-labelledby="mov-title" className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                        <h2 id="mov-title" className="text-[20px] font-semibold tracking-tight">Movimentações</h2>
                                        <Segmented
                                            className="ml-auto"
                                            size="sm"
                                            ariaLabel="Filtrar"
                                            value={filter}
                                            onChange={setFilter}
                                            options={[{ value: 'all', label: 'Todas' }, { value: 'entry', label: 'Entradas' }, { value: 'exit', label: 'Saídas' }]}
                                        />
                                    </div>
                                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                                        {shown.length ? shown.map(tx => (
                                            <li key={tx.id}>
                                                <TxRow tx={tx} onClick={() => setSelected(tx)} />
                                            </li>
                                        )) : (
                                            <li className="px-4 py-8 text-center text-[15px] text-muted-foreground">
                                                {txs.length ? 'Nada neste filtro.' : register ? 'Nenhuma movimentação ainda. As vendas e OS pagas aparecem aqui.' : 'Nenhuma movimentação hoje.'}
                                            </li>
                                        )}
                                    </ul>
                                </section>
                            </div>

                            <aside className="space-y-4 mt-4 lg:mt-0 min-w-0">
                                {register && chart.length > 1 && (
                                    <section aria-labelledby="chart-title" className="rounded-2xl bg-card border border-border/60 p-4">
                                        <h2 id="chart-title" className="text-[15px] font-medium text-muted-foreground">Saldo ao longo do dia</h2>
                                        <VizScope>
                                            <PrivateBlock label="Saldo oculto">
                                                <div className="h-40 mt-2">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={chart} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                                                            <defs>
                                                                <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="var(--viz-s1)" stopOpacity={0.25} />
                                                                    <stop offset="100%" stopColor="var(--viz-s1)" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--viz-axis)' }} minTickGap={24} />
                                                            <YAxis hide domain={['dataMin', 'dataMax']} />
                                                            <Tooltip
                                                                formatter={(v) => [brl(Number(v)), 'Saldo']}
                                                                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 13 }}
                                                                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                                                            />
                                                            <Area type="stepAfter" dataKey="v" stroke="var(--viz-s1)" strokeWidth={2} fill="url(#cashFill)" isAnimationActive={false} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </PrivateBlock>
                                        </VizScope>
                                    </section>
                                )}

                                <section aria-labelledby="closings-title" className="space-y-2">
                                    <div className="flex items-end justify-between px-1">
                                        <h2 id="closings-title" className="text-[20px] font-semibold tracking-tight">Fechamentos</h2>
                                        <button type="button" onClick={() => setTab('history')} className="text-[15px] text-primary inline-flex items-center">Histórico <ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                                        {registers.filter(r => r.status === 'closed').slice(0, 4).map(r => (
                                            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                                                <Wallet className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-[15px] font-medium truncate">{new Date(r.opened_at).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                    <span className="block text-[13px] text-muted-foreground truncate">{timeOf(r.opened_at)}–{r.closed_at ? timeOf(r.closed_at) : '…'}{r.users?.full_name ? ` · ${r.users.full_name}` : ''}</span>
                                                </span>
                                                <span className="text-[15px] font-medium tabular-nums"><Amount value={num(r.closing_balance)} plain /></span>
                                            </li>
                                        ))}
                                        {!registers.some(r => r.status === 'closed') && (
                                            <li className="px-4 py-6 text-center text-[15px] text-muted-foreground">Nenhum fechamento ainda.</li>
                                        )}
                                    </ul>
                                </section>
                            </aside>
                        </div>
                    )}
                </div>
            </PrivacyProvider>

            <OpenCashSheet open={openSheet} onClose={() => setOpenSheet(false)} onDone={load} />
            {register && (
                <>
                    <MovementSheet open={movement !== null} type={movement ?? 'entry'} registerId={register.id} onClose={() => setMovement(null)} onDone={load} />
                    <CloseCashSheet
                        open={closeSheet}
                        onClose={() => setCloseSheet(false)}
                        onDone={load}
                        registerId={register.id}
                        opening={opening}
                        entries={s.entries}
                        exits={s.exits}
                        balance={s.balance}
                        drawer={s.drawer}
                    />
                </>
            )}
            <TransactionSheet tx={selected} onClose={() => setSelected(null)} onDone={load} editable={!!register && selected?.cash_register_id === register.id} />
            {recurring && <RecurringExpensesModal isOpen={recurring} onClose={() => { setRecurring(false); load() }} />}
        </div>
    )
}

const METHOD_COLOR: Record<string, string> = {
    cash: 'bg-emerald-500',
    pix: 'bg-teal-400',
    card: 'bg-indigo-500',
    other: 'bg-foreground/30',
}

function Cell({ label, tone, children }: { label: string; tone?: 'in' | 'out'; children: React.ReactNode }) {
    return (
        <div className="px-2 py-3 text-center min-w-0">
            <p className={cn(
                'text-[15px] font-semibold tabular-nums truncate',
                tone === 'in' && 'text-emerald-700 dark:text-emerald-400',
                tone === 'out' && 'text-red-600 dark:text-red-400',
            )}>{children}</p>
            <p className="text-[13px] text-muted-foreground truncate">{label}</p>
        </div>
    )
}

function Action({ label, onClick, disabled, primary, className, children }: { label: string; onClick: () => void; disabled?: boolean; primary?: boolean; className?: string; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} className="flex flex-col items-center gap-1.5 min-w-0 disabled:opacity-40">
            <span className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center transition-transform active:scale-95',
                primary ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' : 'bg-card border border-border/60',
                !primary && className,
            )}>{children}</span>
            <span className="text-[13px] font-medium truncate max-w-full">{label}</span>
        </button>
    )
}
