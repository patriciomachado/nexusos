'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RevenueChartProps {
    data?: { name: string; revenue: number }[]
    totalRevenue?: string
    height?: number
}

const defaultData = [
    { name: 'Seg', revenue: 0 },
    { name: 'Ter', revenue: 0 },
    { name: 'Qua', revenue: 0 },
    { name: 'Qui', revenue: 0 },
    { name: 'Sex', revenue: 0 },
    { name: 'Sab', revenue: 0 },
    { name: 'Dom', revenue: 0 },
]

export default function RevenueChart({ data = defaultData, totalRevenue = 'R$ 0,00', height = 300 }: RevenueChartProps) {
    return (
        <div style={{ height }} className="w-full p-3 sm:p-4 rounded-2xl bg-card border border-border relative overflow-hidden group" suppressHydrationWarning>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                    <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Análise de Receita (7 dias)</h3>
                    <p className="text-lg font-black text-foreground">{totalRevenue}</p>
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
                <ResponsiveContainer width="100%" height="80%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900 }}
                            dy={10}
                        />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '16px',
                                fontSize: '10px',
                                color: '#fff',
                                backdropFilter: 'blur(10px)'
                            }}
                            itemStyle={{ color: '#3b82f6', fontWeight: 900 }}
                            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
