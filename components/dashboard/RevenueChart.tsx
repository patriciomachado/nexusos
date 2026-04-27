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

export default function RevenueChart({ data = defaultData, totalRevenue = 'R$ 0,00', totalProfit, height = 300 }: RevenueChartProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <div style={{ height }} className="w-full p-3 sm:p-4 rounded-2xl bg-card border border-border relative overflow-hidden group" suppressHydrationWarning>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex gap-6">
                    <div>
                        <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Receita (7 dias)</h3>
                        <p className="text-lg font-black text-foreground">{totalRevenue}</p>
                    </div>
                    {totalProfit && (
                        <div>
                            <h3 className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.2em]">Lucro Líquido</h3>
                            <p className="text-lg font-black text-emerald-500">{totalProfit}</p>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {['7 Dias', '30 Dias'].map(p => (
                        <button
                            key={p}
                            className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${p === '7 Dias' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-full w-full absolute inset-0 pt-16">
                {mounted ? (
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart
                            data={data}
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
                                tick={{ fill: 'currentColor', opacity: 0.3, fontSize: 10, fontWeight: 900 }}
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
                                    `R$ ${Number(value).toFixed(2)}`, 
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
