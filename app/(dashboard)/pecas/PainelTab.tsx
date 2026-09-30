'use client'

import { AlertTriangle, ChevronRight, Loader2, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import { brl } from '@/components/ui/form'
import { qty, useData } from './shared'

interface Dash {
    parts: number; invested: number; stale_value: number; low: number; turnover_90: number | null
    open_orders: number; open_orders_total: number; pending_defects: number
    top: { id: string; name: string; out: number; stock: number }[]
    stale: { id: string; name: string; stock: number; value: number }[]
    profitable: { id: string; name: string; qty: number; revenue: number; profit: number; margin: number | null }[]
}

type Go = (tab: 'estoque' | 'comprar' | 'defeitos' | 'precos') => void

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warn' | 'bad' }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 p-3.5 min-w-0">
            <p className="text-[13px] text-muted-foreground truncate">{label}</p>
            <p className={`text-[22px] font-semibold tabular-nums truncate ${tone === 'bad' ? 'text-red-600 dark:text-red-400' : tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : ''}`}>{value}</p>
            {hint && <p className="text-[12px] text-muted-foreground truncate">{hint}</p>}
        </div>
    )
}

function List({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
    return (
        <section className="space-y-1.5">
            <h3 className="px-4 text-[13px] font-medium text-muted-foreground">{title}</h3>
            <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                {children.length ? children : <p className="px-4 py-4 text-[15px] text-muted-foreground">{empty}</p>}
            </div>
        </section>
    )
}

/** Overview: money in stock, what sells, what is stuck, what earns the most. */
export default function PainelTab({ onGo }: { onGo: Go }) {
    const { data: d } = useData<Dash>('/api/parts/dashboard')
    if (!d) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

    if (d.parts === 0) {
        return (
            <div className="rounded-2xl bg-card border border-border/60 p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto"><Package className="w-6 h-6" /></div>
                <p className="text-[17px] font-semibold">Cadastre suas peças</p>
                <p className="text-[15px] text-muted-foreground">Telas, baterias, conectores… Quando o técnico usar uma peça na OS, ela sai do estoque sozinha, e o app avisa o que precisa comprar.</p>
                <button type="button" onClick={() => onGo('estoque')} className="h-11 px-5 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold">Cadastrar peça</button>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2.5">
                <Tile label="Dinheiro em peças" value={brl(d.invested)} hint={`${d.parts} peças cadastradas`} />
                <Tile label="Parado há 90 dias" value={brl(d.stale_value)} hint="Sem saída no período" tone={d.stale_value > 0 ? 'warn' : undefined} />
                <Tile label="Giro (90 dias)" value={d.turnover_90 != null ? `${String(d.turnover_90).replace('.', ',')}×` : '—'} hint="Saídas ÷ estoque atual" />
                <Tile label="Precisa comprar" value={String(d.low)} hint="Abaixo do mínimo ou em falta" tone={d.low > 0 ? 'bad' : undefined} />
            </div>

            {(d.low > 0 || d.open_orders > 0 || d.pending_defects > 0) && (
                <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                    {d.low > 0 && (
                        <button type="button" onClick={() => onGo('comprar')} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left">
                            <ShoppingCart className="w-5 h-5 text-red-500" /><span className="flex-1 text-[17px]">{d.low} {d.low === 1 ? 'peça para comprar' : 'peças para comprar'}</span><ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                        </button>
                    )}
                    {d.open_orders > 0 && (
                        <button type="button" onClick={() => onGo('comprar')} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left">
                            <Package className="w-5 h-5 text-sky-500" /><span className="flex-1 text-[17px]">{d.open_orders} {d.open_orders === 1 ? 'pedido a caminho' : 'pedidos a caminho'}</span><span className="text-[15px] text-muted-foreground tabular-nums">{brl(d.open_orders_total)}</span><ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                        </button>
                    )}
                    {d.pending_defects > 0 && (
                        <button type="button" onClick={() => onGo('defeitos')} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /><span className="flex-1 text-[17px]">{d.pending_defects} {d.pending_defects === 1 ? 'defeito sem resposta do fornecedor' : 'defeitos sem resposta do fornecedor'}</span><ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                        </button>
                    )}
                </div>
            )}

            <List title="Mais usadas (30 dias)" empty="Nenhuma peça saiu nos últimos 30 dias.">
                {d.top.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-6 text-[15px] font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                        <span className="flex-1 min-w-0 text-[17px] truncate">{p.name}</span>
                        <span className="text-[15px] tabular-nums">{qty(p.out)} un</span>
                        <span className={`text-[13px] tabular-nums w-16 text-right ${p.stock <= 0 ? 'text-red-600' : 'text-muted-foreground'}`}>resta {qty(p.stock)}</span>
                    </div>
                ))}
            </List>

            <List title="Lucro por peça nas OS (30 dias)" empty="Ainda sem OS com peças do estoque neste mês.">
                {d.profitable.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="flex-1 min-w-0">
                            <span className="block text-[17px] truncate">{p.name}</span>
                            <span className="block text-[13px] text-muted-foreground">{qty(p.qty)} un · cobrou {brl(p.revenue)}</span>
                        </span>
                        <span className="text-right">
                            <span className="block text-[15px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{brl(p.profit)}</span>
                            {p.margin != null && <span className="block text-[12px] text-muted-foreground">{p.margin}% de margem</span>}
                        </span>
                    </div>
                ))}
            </List>

            <List title="Paradas há mais de 90 dias" empty="Nenhuma peça parada. Ótimo giro!">
                {d.stale.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex-1 min-w-0 text-[17px] truncate">{p.name}</span>
                        <span className="text-[13px] text-muted-foreground tabular-nums">{qty(p.stock)} un</span>
                        <span className="text-[15px] tabular-nums text-amber-700 dark:text-amber-400">{brl(p.value)}</span>
                    </div>
                ))}
            </List>
            {d.stale.length > 0 && <p className="px-4 -mt-3 text-[13px] text-muted-foreground">Dica: faça promoção dessas peças ou devolva ao fornecedor para liberar dinheiro.</p>}
        </div>
    )
}
