'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RevenueChartProps {
    data?: { name: string; revenue: number; profit?: number }[]
    totalRevenue?: string
    totalProfit?: string
    height?: number
}

const defaultData = [
    { name: 'Seg', revenue: 0, profit: 0 },
    { name: 'Ter', revenue: 0, profit: 0 },
    { name: 'Qua', revenue: 0, profit: 0 },
    { name: 'Qui', revenue: 0, profit: 0 },
    { name: 'Sex', revenue: 0, profit: 0 },
    { name: 'Sab', revenue: 0, profit: 0 },
    { name: 'Dom', revenue: 0, profit: 0 },
]

export default function RevenueChart({ data = defaultData, height = 300 }: RevenueChartProps) {
    const [mounted, setMounted] = useState(false)
    const [days, setDays] = useState(7)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    const filteredData = data.slice(-days)
    const rangeRevenue = filteredData.reduce((sum, item) => sum + (item.revenue || 0), 0)
    const rangeProfit = filteredData.reduce((sum, item) => sum + (item.profit || 0), 0)

    const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    return (
        <div style={{ height }} className="w-full p-3 sm:p-4 rounded-2xl bg-card border border-border relative overflow-hidden group" suppressHydrationWarning>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex gap-4 sm:gap-6">
                    <div>
                        <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Receita ({days} dias)</h3>
                        <p className="text-base sm:text-lg font-black text-foreground">{formatBRL(rangeRevenue)}</p>
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.2em]">Lucro Líquido ({days}d)</h3>
                        <p className={`text-base sm:text-lg font-black ${rangeProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {formatBRL(rangeProfit)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1 sm:gap-2">
                    {[7, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-1.5 py-1 sm:px-2 sm:py-1 lg:px-3 lg:py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${days === d ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}
                        >
                            {d} Dias
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-full w-full absolute inset-0 pt-16">
                {mounted ? (
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart
                            data={filteredData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.3, fontSize: 9, fontWeight: 900 }}
                                interval={days === 30 ? 5 : 0}
                                dy={10}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '16px',
                                    fontSize: '10px',
                                    color: 'hsl(var(--foreground))',
                                    backdropFilter: 'blur(10px)'
                                }}
                                itemStyle={{ fontWeight: 900 }}
                                formatter={(value: any, name: any) => [
                                    `R$ ${Number(value || 0).toFixed(2)}`, 
                                    name === 'revenue' ? 'Receita' : 'Lucro'
                                ]}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                name="revenue"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                animationDuration={2000}
                            />
                            <Area
                                type="monotone"
                                dataKey="profit"
                                name="profit"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorProfit)"
                                animationDuration={2500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-[80%] bg-muted/20 animate-pulse rounded-xl" />
                )}
            </div>
        </div>
    )
}
