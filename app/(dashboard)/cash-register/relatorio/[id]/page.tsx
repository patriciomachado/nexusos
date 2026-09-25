import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { buildClosingReport } from '@/lib/cash/report'
import { brl, groupOf, isManager } from '@/lib/cash/server'
import ReportActions from './ReportActions'

const TZ = 'America/Sao_Paulo'
const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const METHOD: Record<string, string> = { cash: 'Dinheiro', pix: 'Pix', debit: 'Débito', credit: 'Crédito', other: 'Outros' }

/** Closing report of one register, ready to print or save as PDF. */
export default async function CashReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, role, company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) redirect('/dashboard')

    const report = await buildClosingReport(db, user.company_id, id).catch(() => null)
    if (!report) notFound()
    const reg = report.register
    if (reg.user_id !== user.id && !isManager(user.role)) redirect('/cash-register')

    const n = report.numbers
    const counted = reg.counted_cash == null ? null : Number(reg.counted_cash)
    const diff = reg.cash_difference == null ? null : Number(reg.cash_difference)
    const day = new Date(reg.opened_at).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
    const rows = report.transactions as { type: string; amount: number; source_type: string | null; description: string | null; created_at: string; justification: string | null; payment_methods: { name?: string; code?: string } | null }[]

    return (
        <div className="min-h-full bg-background">
            <Header title="Relatório do caixa" />
            <div className="print-report max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
                <div className="no-print flex flex-wrap items-center justify-between gap-3">
                    <Link href="/cash-register" className="inline-flex items-center text-[15px] text-primary"><ChevronLeft className="w-4 h-4" /> Caixa</Link>
                    <ReportActions id={id} text={report.text} />
                </div>

                <header>
                    <p className="text-[13px] text-muted-foreground">{report.company}</p>
                    <h1 className="text-[26px] font-semibold tracking-tight">Fechamento do caixa</h1>
                    <p className="text-[15px] text-muted-foreground first-letter:uppercase">
                        {day} · {time(reg.opened_at)}–{reg.closed_at ? time(reg.closed_at) : 'aberto'}
                        {report.opener ? ` · aberto por ${report.opener}` : ''}{report.closer && report.closer !== report.opener ? ` · fechado por ${report.closer}` : ''}
                    </p>
                </header>

                <Section title="Resumo">
                    <Row label="Abertura (troco)" value={brl(n.opening)} />
                    <Row label="Entradas" value={`+ ${brl(n.entries)}`} />
                    <Row label="Saídas" value={`− ${brl(n.exits)}`} />
                    <Row label="Saldo final" value={brl(n.balance)} strong />
                </Section>

                <Section title={`Recebido · ${n.sales} ${n.sales === 1 ? 'recebimento' : 'recebimentos'}`}>
                    {Object.entries(n.byMethod).filter(([, v]) => v > 0).map(([k, v]) => <Row key={k} label={METHOD[k]} value={brl(v)} />)}
                    {n.fees > 0 && <Row label="Taxas da maquininha (estimadas)" value={`− ${brl(n.fees)}`} />}
                    <Row label="Total recebido" value={brl(n.received)} strong />
                </Section>

                <Section title="Dinheiro na gaveta">
                    <Row label="Esperado" value={brl(n.expectedCash)} />
                    <Row label="Contado" value={counted == null ? 'não contado' : brl(counted)} />
                    {diff != null && <Row label={Math.abs(diff) < 0.01 ? 'Diferença' : diff > 0 ? 'Sobrou' : 'Faltou'} value={Math.abs(diff) < 0.01 ? 'bateu ✓' : brl(Math.abs(diff))} strong />}
                    {reg.left_in_drawer != null && <Row label="Ficou de troco" value={brl(Number(reg.left_in_drawer))} />}
                    {n.withdrawals > 0 && <Row label="Sangrias" value={brl(n.withdrawals)} />}
                    {n.supplies > 0 && <Row label="Suprimentos" value={brl(n.supplies)} />}
                    {n.expenses > 0 && <Row label="Despesas pagas no caixa" value={brl(n.expenses)} />}
                </Section>

                <Section title={`Movimentações (${rows.length})`}>
                    {rows.length ? rows.map((t, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 px-4 py-2.5 text-[14px]">
                            <span className="min-w-0">
                                <span className="block truncate">{t.description || (t.type === 'entry' ? 'Entrada' : 'Saída')}</span>
                                <span className="block text-[12px] text-muted-foreground">{time(t.created_at)} · {t.payment_methods?.name ?? METHOD[groupOf(t)]}{t.justification ? ` · ${t.justification}` : ''}</span>
                            </span>
                            <span className="tabular-nums shrink-0">{t.type === 'entry' ? '+' : '−'} {brl(Number(t.amount))}</span>
                        </div>
                    )) : <p className="px-4 py-4 text-[14px] text-muted-foreground">Nenhuma movimentação.</p>}
                </Section>

                <p className="text-[12px] text-muted-foreground">Gerado pelo Nexus OS em {new Date().toLocaleString('pt-BR', { timeZone: TZ })}.</p>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-1.5 break-inside-avoid">
            <h2 className="px-4 text-[13px] font-medium text-muted-foreground">{title}</h2>
            <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">{children}</div>
        </section>
    )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 min-h-[44px]">
            <span className={strong ? 'text-[15px] font-semibold' : 'text-[15px]'}>{label}</span>
            <span className={strong ? 'text-[15px] font-semibold tabular-nums' : 'text-[15px] tabular-nums'}>{value}</span>
        </div>
    )
}
