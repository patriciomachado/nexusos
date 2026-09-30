'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

interface OSSecurityViewProps {
    type: 'pin' | 'pattern'
    value: string
}

const pos = (i: number) => ({ x: (i % 3) * 100 + 50, y: Math.floor(i / 3) * 100 + 50 })

/** The device unlock code, hidden until someone taps to show it. */
export default function OSSecurityView({ type, value }: OSSecurityViewProps) {
    const [visible, setVisible] = useState(false)
    const points = type === 'pattern' ? value.split('-').map(Number).filter(n => !isNaN(n)) : []

    return (
        <section className="space-y-1.5">
            <h2 className="px-4 text-[13px] font-medium text-muted-foreground">Senha do aparelho</h2>
            <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                <button type="button" onClick={() => setVisible(v => !v)} aria-expanded={visible} className="w-full px-4 min-h-[52px] flex items-center gap-3 text-left">
                    <Lock className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                    <span className="flex-1 text-[17px]">{type === 'pin' ? 'PIN ou senha' : 'Padrão de desenho'}</span>
                    <span className="text-[15px] text-primary inline-flex items-center gap-1.5">
                        {visible ? <><EyeOff className="w-4 h-4" /> Ocultar</> : <><Eye className="w-4 h-4" /> Mostrar</>}
                    </span>
                </button>
                {visible && (
                    <div className="px-4 py-4 flex justify-center animate-in fade-in duration-200">
                        {type === 'pin' ? (
                            <span className="text-[28px] font-semibold tracking-[0.2em] tabular-nums select-all break-all">{value}</span>
                        ) : (
                            <svg viewBox="0 0 300 300" className="w-44 h-44" role="img" aria-label={`Padrão: ${points.map(p => p + 1).join(', ')}`}>
                                {points.slice(1).map((p, i) => {
                                    const a = pos(points[i]); const b = pos(p)
                                    return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(var(--primary))" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
                                })}
                                {Array.from({ length: 9 }, (_, i) => {
                                    const order = points.indexOf(i)
                                    return (
                                        <g key={i}>
                                            <circle cx={pos(i).x} cy={pos(i).y} r={24} fill={order >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.06)'} />
                                            {order >= 0
                                                ? <text x={pos(i).x} y={pos(i).y + 7} textAnchor="middle" fontSize="20" fontWeight="600" fill="white">{order + 1}</text>
                                                : <circle cx={pos(i).x} cy={pos(i).y} r={5} fill="hsl(var(--foreground) / 0.35)" />}
                                        </g>
                                    )
                                })}
                            </svg>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}
