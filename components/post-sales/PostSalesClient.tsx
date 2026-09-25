'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, MessageCircle, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import Segmented from '@/components/ui/Segmented'
import { useFeature } from '@/components/plans/PlanProvider'
import UpgradeCard from '@/components/plans/UpgradeCard'

export interface Rating {
    id: string
    rating: number
    comment: string | null
    sentiment: 'positive' | 'neutral' | 'negative' | null
    created_at: string
    customer_name: string
    customer_phone: string | null
    technician: string | null
    order_id: string
    order_number: string
    order_title: string
}

export interface Delivered {
    id: string
    order_number: string
    title: string
    delivered_at: string
    tracking_token: string | null
    customer_name: string
    customer_phone: string | null
    rated: boolean
}

type Tab = 'contatar' | 'avaliacoes' | 'tendencia'
type Filter = 'all' | '5' | '4' | 'low'

const DAY = 86_400_000
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const CONTACTED_KEY = 'postsales:contacted'

const firstName = (name: string) => name.split(' ')[0]
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
const ago = (iso: string, now: number) => {
    const d = Math.floor((now - new Date(iso).getTime()) / DAY)
    return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}

function waLink(phone: string | null, text: string) {
    let d = (phone ?? '').replace(/\D/g, '')
    if (d.length < 10) return null
    if (!d.startsWith('55')) d = `55${d}`
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
    return (
        <span className="inline-flex" aria-label={`${value} de 5 estrelas`}>
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', i <= value ? 'fill-amber-400 text-amber-400' : 'text-foreground/15')} />
            ))}
        </span>
    )
}

/** Contacted items are remembered on this device so the list shrinks as you work through it. */
function useContacted() {
    const [ids, setIds] = useState<Record<string, number>>({})
    useEffect(() => {
        try {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIds(JSON.parse(localStorage.getItem(CONTACTED_KEY) || '{}'))
        } catch { /* private mode */ }
    }, [])
    const mark = (id: string) => setIds(prev => {
        const next = { ...prev, [id]: Date.now() }
        // Forget entries older than 90 days.
        for (const [k, t] of Object.entries(next)) if (Date.now() - t > 90 * DAY) delete next[k]
        try { localStorage.setItem(CONTACTED_KEY, JSON.stringify(next)) } catch { /* private mode */ }
        return next
    })
    return { contacted: ids, mark }
}

export default function PostSalesClient({ ratings, delivered, storeName, googleReviewUrl }: { ratings: Rating[]; delivered: Delivered[]; storeName: string; googleReviewUrl: string | null }) {
    const canContact = useFeature('post_sales_contact')
    const [tab, setTab] = useState<Tab>(() => (canContact ? 'contatar' : 'avaliacoes'))
    const [now] = useState(() => Date.now())
    const { contacted, mark } = useContacted()
    const [origin, setOrigin] = useState('')
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrigin(window.location.origin)
    }, [])

    const stats = useMemo(() => {
        const last30 = ratings.filter(r => now - new Date(r.created_at).getTime() <= 30 * DAY)
        const base = ratings.filter(r => now - new Date(r.created_at).getTime() <= 90 * DAY)
        const avg = base.length ? base.reduce((s, r) => s + r.rating, 0) / base.length : null
        const promoters = base.filter(r => r.rating === 5).length
        const detractors = base.filter(r => r.rating <= 3).length
        const nps = base.length ? Math.round(((promoters - detractors) / base.length) * 100) : null
        const deliveredLast30 = delivered.filter(d => now - new Date(d.delivered_at).getTime() <= 30 * DAY)
        const answered = deliveredLast30.filter(d => d.rated).length
        return { avg, nps, count: base.length, last30: last30.length, responseRate: deliveredLast30.length ? answered / deliveredLast30.length : null }
    }, [ratings, delivered, now])

    // Action lists
    const unhappy = ratings.filter(r => r.rating <= 3 && now - new Date(r.created_at).getTime() <= 60 * DAY)
    const toAsk = delivered.filter(d => !d.rated)
    const happy = googleReviewUrl ? ratings.filter(r => r.rating === 5 && now - new Date(r.created_at).getTime() <= 60 * DAY) : []
    const pending = [...unhappy.map(r => `r-${r.id}`), ...toAsk.map(d => `d-${d.id}`), ...happy.map(r => `g-${r.id}`)].filter(k => !contacted[k]).length

    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 max-w-5xl mx-auto space-y-4">
            {/* Compact KPI strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <Kpi label="Nota média" value={stats.avg == null ? '—' : stats.avg.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} extra={stats.avg != null ? <Stars value={Math.round(stats.avg)} /> : <span>sem avaliações</span>} />
                <Kpi label="NPS estimado" value={stats.nps == null ? '—' : String(stats.nps)} extra={<span>{stats.nps == null ? '—' : stats.nps >= 50 ? 'Excelente' : stats.nps >= 0 ? 'Bom' : 'Atenção'}</span>} />
                <Kpi label="Avaliações" value={String(stats.count)} extra={<span>{stats.last30} nos últimos 30 dias</span>} />
                <Kpi label="Taxa de resposta" value={stats.responseRate == null ? '—' : `${Math.round(stats.responseRate * 100)}%`} extra={<span>OS entregues (30 dias)</span>} />
            </div>
            <p className="text-[12px] text-muted-foreground -mt-1">Nota, NPS e total dos últimos 90 dias. NPS estimado pela nota: 5★ promotor, 4★ neutro, até 3★ detrator.</p>

            <Segmented<Tab>
                value={tab}
                onChange={setTab}
                ariaLabel="Seções do pós-venda"
                options={[
                    { value: 'contatar', label: 'Contatar', badge: canContact ? pending : undefined },
                    { value: 'avaliacoes', label: 'Avaliações' },
                    { value: 'tendencia', label: 'Tendência' },
                ]}
            />

            {tab === 'contatar' && !canContact && <UpgradeCard feature="post_sales_contact" compact />}
            {tab === 'contatar' && canContact && (
                <div className="space-y-4">
                    <ActionGroup
                        title="Recuperar clientes insatisfeitos"
                        hint="Avaliações de 3 estrelas ou menos nos últimos 60 dias. Um contato rápido costuma reverter a experiência."
                        empty="Nenhum cliente insatisfeito. 👏"
                        items={unhappy.map(r => ({
                            key: `r-${r.id}`,
                            title: r.customer_name,
                            line: <><Stars value={r.rating} /> <span className="ml-1">{r.order_number} · {ago(r.created_at, now)}</span></>,
                            quote: r.comment,
                            href: waLink(r.customer_phone, `Olá ${firstName(r.customer_name)}, aqui é da ${storeName}. Vimos sua avaliação sobre o serviço ${r.order_number} e queremos entender o que aconteceu para resolver. Podemos conversar?`),
                            cta: 'Chamar',
                        }))}
                        contacted={contacted}
                        onContact={mark}
                    />
                    <ActionGroup
                        title="Pedir avaliação"
                        hint="OS entregues nos últimos 45 dias que ainda não foram avaliadas. O link abre a página da OS com a avaliação."
                        empty="Todas as OS entregues recentemente já foram avaliadas."
                        items={toAsk.map(d => ({
                            key: `d-${d.id}`,
                            title: d.customer_name,
                            line: <span>{d.order_number} · {d.title} · entregue {ago(d.delivered_at, now)}</span>,
                            href: d.tracking_token && origin ? waLink(d.customer_phone, `Olá ${firstName(d.customer_name)}! Aqui é da ${storeName}. Obrigado por confiar no nosso serviço (${d.order_number}). Pode nos contar como foi? Leva 10 segundos: ${origin}/tracking/${d.tracking_token}`) : null,
                            cta: 'Pedir',
                        }))}
                        contacted={contacted}
                        onContact={mark}
                    />
                    {googleReviewUrl ? (
                        <ActionGroup
                            title="Convidar para o Google"
                            hint="Quem deu 5 estrelas nos últimos 60 dias. Avaliações no Google trazem novos clientes."
                            empty="Nenhuma avaliação 5 estrelas recente."
                            items={happy.map(r => ({
                                key: `g-${r.id}`,
                                title: r.customer_name,
                                line: <><Stars value={5} /> <span className="ml-1">{r.order_number} · {ago(r.created_at, now)}</span></>,
                                href: waLink(r.customer_phone, `Olá ${firstName(r.customer_name)}! Ficamos muito felizes com sua avaliação 5 estrelas 😊 Se puder, deixe também sua opinião no Google, ajuda muito a ${storeName}: ${googleReviewUrl}`),
                                cta: 'Convidar',
                            }))}
                            contacted={contacted}
                            onContact={mark}
                        />
                    ) : (
                        <p className="text-[13px] text-muted-foreground rounded-xl bg-foreground/[0.03] px-3 py-2.5">
                            Dica: cadastre o link de avaliação do Google em <Link href="/settings" className="text-primary">Configurações</Link> para convidar quem deu 5 estrelas.
                        </p>
                    )}
                </div>
            )}

            {tab === 'avaliacoes' && <RatingsList ratings={ratings} />}
            {tab === 'tendencia' && <Trend ratings={ratings} />}
        </div>
    )
}

function Kpi({ label, value, extra }: { label: string; value: string; extra: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 px-3.5 py-3 min-w-0">
            <p className="text-[12px] text-muted-foreground truncate">{label}</p>
            <p className="text-[22px] leading-tight font-semibold tracking-tight">{value}</p>
            <div className="text-[12px] text-muted-foreground truncate mt-0.5">{extra}</div>
        </div>
    )
}

interface ActionItem { key: string; title: string; line: React.ReactNode; quote?: string | null; href: string | null; cta: string }

function ActionGroup({ title, hint, empty, items, contacted, onContact }: { title: string; hint: string; empty: string; items: ActionItem[]; contacted: Record<string, number>; onContact: (k: string) => void }) {
    const sorted = [...items].sort((a, b) => Number(!!contacted[a.key]) - Number(!!contacted[b.key]))
    const open = items.filter(i => !contacted[i.key]).length
    return (
        <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
            <header className="px-4 pt-3.5 pb-2">
                <h2 className="text-[16px] font-semibold flex items-center gap-2">
                    {title}
                    {open > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center">{open}</span>}
                </h2>
                <p className="text-[12px] text-muted-foreground">{hint}</p>
            </header>
            {sorted.length === 0 ? (
                <p className="px-4 pb-4 text-[14px] text-muted-foreground">{empty}</p>
            ) : (
                <ul className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
                    {sorted.map(item => {
                        const done = !!contacted[item.key]
                        return (
                            <li key={item.key} className={cn('px-4 py-2.5 flex items-center gap-3', done && 'opacity-55')}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-medium truncate">{item.title}</p>
                                    <p className="text-[12px] text-muted-foreground truncate flex items-center">{item.line}</p>
                                    {item.quote && <p className="text-[13px] text-foreground/80 line-clamp-2 mt-0.5">“{item.quote}”</p>}
                                </div>
                                {done ? (
                                    <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1 shrink-0"><Check className="w-3.5 h-3.5" /> Contatado</span>
                                ) : item.href ? (
                                    <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => onContact(item.key)}
                                        className="h-8 px-3 rounded-full bg-green-500/12 text-green-700 dark:text-green-400 text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0">
                                        <MessageCircle className="w-3.5 h-3.5" /> {item.cta}
                                    </a>
                                ) : (
                                    <span className="text-[12px] text-muted-foreground shrink-0">sem telefone</span>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}

function RatingsList({ ratings }: { ratings: Rating[] }) {
    const [filter, setFilter] = useState<Filter>('all')
    const [q, setQ] = useState('')
    const shown = ratings.filter(r =>
        (filter === 'all' || (filter === 'low' ? r.rating <= 3 : r.rating === Number(filter))) &&
        (!q || `${r.customer_name} ${r.order_number} ${r.comment ?? ''} ${r.technician ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    )
    return (
        <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
            <div className="p-3 space-y-2.5 border-b border-border/60">
                <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-foreground/[0.05]">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cliente, OS, técnico ou comentário" aria-label="Buscar avaliações" className="flex-1 bg-transparent text-[16px] focus:outline-none placeholder:text-muted-foreground" />
                </label>
                <Segmented<Filter> size="sm" value={filter} onChange={setFilter} ariaLabel="Filtrar por nota" options={[
                    { value: 'all', label: 'Todas' },
                    { value: '5', label: '5★' },
                    { value: '4', label: '4★' },
                    { value: 'low', label: '3★ ou menos', badge: ratings.filter(r => r.rating <= 3).length },
                ]} />
            </div>
            {shown.length === 0 ? (
                <p className="p-6 text-center text-[14px] text-muted-foreground">
                    {ratings.length === 0 ? 'Ainda não há avaliações. Use "Pedir avaliação" na aba Contatar: o cliente avalia pelo link de acompanhamento da OS.' : 'Nenhuma avaliação com esse filtro.'}
                </p>
            ) : (
                <ul className="divide-y divide-border/50">
                    {shown.slice(0, 200).map(r => (
                        <li key={r.id} className="px-4 py-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[15px] font-medium truncate">{r.customer_name}</p>
                                <span className="text-[12px] text-muted-foreground shrink-0">{shortDate(r.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                <Stars value={r.rating} />
                                <Link href={`/service-orders/${r.order_id}`} className="truncate hover:text-primary">{r.order_number}{r.order_title ? ` · ${r.order_title}` : ''}</Link>
                                {r.technician && <span className="truncate">· {r.technician}</span>}
                            </div>
                            {r.comment && <p className="text-[14px] text-foreground/85 mt-1 line-clamp-3">{r.comment}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

function Trend({ ratings }: { ratings: Rating[] }) {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return { key: `${d.getFullYear()}-${d.getMonth()}`, label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, items: [] as Rating[] }
    })
    for (const r of ratings) {
        const d = new Date(r.created_at)
        months.find(m => m.key === `${d.getFullYear()}-${d.getMonth()}`)?.items.push(r)
    }
    const maxCount = Math.max(1, ...months.map(m => m.items.length))
    const dist = [5, 4, 3, 2, 1].map(n => ({ n, count: ratings.filter(r => r.rating === n).length }))
    const maxDist = Math.max(1, ...dist.map(d => d.count))

    return (
        <div className="grid md:grid-cols-2 gap-4">
            <section className="rounded-2xl bg-card border border-border/60 p-4">
                <h2 className="text-[16px] font-semibold">Mês a mês</h2>
                <p className="text-[12px] text-muted-foreground mb-3">Quantidade de avaliações e nota média de cada mês.</p>
                <table className="w-full text-[14px]">
                    <thead className="text-[12px] text-muted-foreground"><tr><th className="text-left font-medium pb-1">Mês</th><th className="text-left font-medium pb-1 pl-2">Avaliações</th><th className="text-right font-medium pb-1">Nota</th></tr></thead>
                    <tbody>
                        {months.map(m => {
                            const avg = m.items.length ? m.items.reduce((s, r) => s + r.rating, 0) / m.items.length : null
                            return (
                                <tr key={m.key}>
                                    <td className="py-1.5 w-16 text-muted-foreground">{m.label}</td>
                                    <td className="py-1.5 pl-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3.5 rounded-r-[4px] bg-primary" style={{ width: m.items.length ? `${Math.max(3, (m.items.length / maxCount) * 100)}%` : 0 }} />
                                            <span className="text-[13px] tabular-nums">{m.items.length}</span>
                                        </div>
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums font-medium">{avg == null ? '—' : `${avg.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ★`}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </section>
            <section className="rounded-2xl bg-card border border-border/60 p-4">
                <h2 className="text-[16px] font-semibold">Distribuição das notas</h2>
                <p className="text-[12px] text-muted-foreground mb-3">Últimos 12 meses · {ratings.length} avaliações</p>
                <ul className="space-y-2">
                    {dist.map(d => (
                        <li key={d.n} className="grid grid-cols-[36px_1fr_40px] items-center gap-2 text-[14px]">
                            <span className="text-muted-foreground tabular-nums">{d.n} ★</span>
                            <div className="h-3.5 rounded-r-[4px] bg-amber-400" style={{ width: d.count ? `${Math.max(3, (d.count / maxDist) * 100)}%` : 0 }} />
                            <span className="text-right tabular-nums">{d.count}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )
}
