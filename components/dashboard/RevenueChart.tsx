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
        <div style={{ height }} className="w-full p-4 sm:p-6 rounded-3xl glass-premium bg-card/65 backdrop-blur-md border border-white/5 relative overflow-hidden group shadow-lg" suppressHydrationWarning>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex gap-4 sm:gap-6">
                    <div>
                        <h3 className="text-[13px] font-black text-muted-foreground opacity-60">Receita ({days} dias)</h3>
                        <p className="text-base sm:text-lg font-black text-foreground">{formatBRL(rangeRevenue)}</p>
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-emerald-400 opacity-80">Lucro Líquido ({days}d)</h3>
                        <p className={`text-base sm:text-lg font-black ${rangeProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatBRL(rangeProfit)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                    {[7, 30].map(d => (
                        <button
 key={d}
 onClick={() => setDays(d)}
 className={`px-3 py-1.5 rounded-xl text-[13px] font-black transition-all duration-300 hover:scale-105 active:scale-95 ${days === d ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'}`}
 >
                            {d} Dias
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-full w-full absolute inset-0 pt-20">
                {mounted ? (
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart
                            data={filteredData}
                            margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 9, fontWeight: 900 }}
                                interval={days === 30 ? 5 : 0}
                                dy={10}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '24px',
                                    fontSize: '10px',
                                    color: '#f8fafc',
                                    backdropFilter: 'blur(16px)',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
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
                                strokeWidth={3.5}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                animationDuration={1500}
                            />
                            <Area
                                type="monotone"
                                dataKey="profit"
                                name="profit"
                                stroke="#10b981"
                                strokeWidth={3.5}
                                fillOpacity={1}
                                fill="url(#colorProfit)"
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-[80%] bg-white/5 animate-pulse rounded-2xl" />
                )}
            </div>
        </div>
    )
}
