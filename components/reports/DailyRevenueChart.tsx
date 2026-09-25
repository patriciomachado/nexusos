'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { brl, brlCompact, dayLabel, dayLong, monthLabel } from './format'

interface Point { date: string; os: number; pdv: number }

/**
 * Revenue per day (or month) as stacked columns: OS (slot 1) + PDV (slot 2).
 * Thin columns with a rounded top, 2px surface gap between segments, a
 * legend, a per-column tooltip, and a table view with the same numbers.
 */
export default function DailyRevenueChart({ data, granularity }: { data: Point[]; granularity: 'day' | 'month' }) {
    const [mounted, setMounted] = useState(false)
    const [table, setTable] = useState(false)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    const label = (d: string) => (granularity === 'month' ? monthLabel(d) : dayLabel(d))
    const total = data.reduce((s, p) => s + p.os + p.pdv, 0)
    const best = data.reduce<Point | null>((b, p) => (!b || p.os + p.pdv > b.os + b.pdv ? p : b), null)

    return (
        <section className="viz rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
            <header className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                    <h2 className="type-headline">Faturamento por {granularity === 'month' ? 'mês' : 'dia'}</h2>
                    <p className="text-[13px] text-muted-foreground">
                        {brl(total)} no período{best && best.os + best.pdv > 0 ? ` · melhor ${granularity === 'month' ? 'mês' : 'dia'}: ${label(best.date)} (${brl(best.os + best.pdv)})` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ul className="flex items-center gap-3 text-[13px] text-muted-foreground" aria-label="Legenda">
                        <li className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--viz-s1)' }} /> Ordens de serviço</li>
                        <li className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--viz-s2)' }} /> Vendas PDV</li>
                    </ul>
                    <button type="button" onClick={() => setTable(t => !t)} className="text-[13px] font-medium text-primary">
                        {table ? 'Ver gráfico' : 'Ver tabela'}
                    </button>
                </div>
            </header>

            {table ? (
                <div className="max-h-[300px] overflow-y-auto -mx-1">
                    <table className="w-full text-[14px]">
                        <thead className="sticky top-0 bg-card text-muted-foreground text-[12px]">
                            <tr><th className="text-left font-medium py-1.5 px-1">{granularity === 'month' ? 'Mês' : 'Dia'}</th><th className="text-right font-medium px-1">OS</th><th className="text-right font-medium px-1">PDV</th><th className="text-right font-medium px-1">Total</th></tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {data.map(p => (
                                <tr key={p.date} className="border-t border-border/50">
                                    <td className="py-1.5 px-1">{granularity === 'month' ? monthLabel(p.date) : dayLong(p.date)}</td>
                                    <td className="text-right px-1">{brl(p.os)}</td>
                                    <td className="text-right px-1">{brl(p.pdv)}</td>
                                    <td className="text-right px-1 font-medium">{brl(p.os + p.pdv)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="h-[260px]" role="img" aria-label={`Faturamento por ${granularity === 'month' ? 'mês' : 'dia'}, total ${brl(total)}`}>
                    {mounted && (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                                <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={label}
                                    tick={{ fill: 'var(--viz-axis)', fontSize: 11 }}
                                    axisLine={{ stroke: 'var(--viz-grid)' }}
                                    tickLine={false}
                                    minTickGap={12}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tickFormatter={brlCompact}
                                    tick={{ fill: 'var(--viz-axis)', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={68}
                                    allowDecimals={false}
                                />
                                <Tooltip cursor={{ fill: 'hsl(var(--foreground) / 0.04)' }} content={<ChartTooltip granularity={granularity} />} />
                                <Bar dataKey="os" name="Ordens de serviço" stackId="r" fill="var(--viz-s1)" maxBarSize={24} stroke="hsl(var(--card))" strokeWidth={2} isAnimationActive={false} />
                                <Bar dataKey="pdv" name="Vendas PDV" stackId="r" fill="var(--viz-s2)" maxBarSize={24} radius={[4, 4, 0, 0]} stroke="hsl(var(--card))" strokeWidth={2} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}
        </section>
    )
}

function ChartTooltip({ active, payload, label, granularity }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; granularity: 'day' | 'month' }) {
    if (!active || !payload?.length || !label) return null
    const os = payload.find(p => p.dataKey === 'os')?.value ?? 0
    const pdv = payload.find(p => p.dataKey === 'pdv')?.value ?? 0
    return (
        <div className="rounded-xl bg-popover border border-border shadow-lg px-3 py-2 text-[13px] min-w-[170px]">
            <p className="text-muted-foreground mb-1">{granularity === 'month' ? monthLabel(label) : dayLong(label)}</p>
            <p className="text-[15px] font-semibold mb-1">{brl(os + pdv)}</p>
            <p className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3 h-0.5 rounded" style={{ background: 'var(--viz-s1)' }} />OS</span><span className="font-medium tabular-nums">{brl(os)}</span></p>
            <p className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3 h-0.5 rounded" style={{ background: 'var(--viz-s2)' }} />PDV</span><span className="font-medium tabular-nums">{brl(pdv)}</span></p>
        </div>
    )
}
