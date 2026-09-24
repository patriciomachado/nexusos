'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock, Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OSSecurityViewProps {
    type: 'pin' | 'pattern'
    value: string
}

const GRID_POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

function getPointPos(index: number) {
    const col = index % 3
    const row = Math.floor(index / 3)
    return { x: col * 100 + 50, y: row * 100 + 50 }
}

export default function OSSecurityView({ type, value }: OSSecurityViewProps) {
    const [visible, setVisible] = useState(false)

    // Decode pattern string "0-2-1-4-6-7-8" to number array [0, 2, 1, 4, 6, 7, 8]
    const points = type === 'pattern' ? value.split('-').map(Number).filter(n => !isNaN(n)) : []

    return (
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 md:p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-amber-500/10 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        {type === 'pin' ? <Lock className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                    </div>
                    <div>
                        <h4 className="text-[13px] font-black text-amber-600 dark:text-amber-400 ">Segurança do Dispositivo</h4>
                        <p className="text-[11px] text-muted-foreground">Credenciais de acesso técnico fornecidas pelo cliente</p>
                    </div>
                </div>
                
                <button
 type="button"
 onClick={() => setVisible(!visible)}
 className={cn(
 "px-3 py-1.5 rounded-lg text-[13px] font-black transition-all flex items-center gap-1.5 border",
 visible
 ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
 : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
 )}
 >
                    {visible ? (
                        <>
                            <EyeOff className="w-3 h-3" />
                            Ocultar Credencial
                        </>
                    ) : (
                        <>
                            <Eye className="w-3 h-3" />
                            Mostrar Credencial
                        </>
                    )}
                </button>
            </div>

            {/* Display Area */}
            <div className="flex flex-col items-center justify-center min-h-[50px] transition-all duration-300">
                {visible ? (
                    type === 'pin' ? (
                        <div className="text-center py-2">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Senha / PIN</span>
                            <span className="text-xl font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-4 py-2 rounded-xl inline-block shadow-inner tracking-wider">
                                {value}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-center">Desenho de Desbloqueio</span>
                            
                            <div className="relative p-3 bg-white/[0.02] border border-foreground/5 rounded-2xl">
                                <svg
                                    viewBox="0 0 300 300"
                                    className="w-44 h-44 select-none pointer-events-none"
                                >
                                    {/* Lines between connected points */}
                                    {points.slice(0, -1).map((pt, i) => {
                                        const a = getPointPos(pt)
                                        const b = getPointPos(points[i + 1])
                                        return (
                                            <line
                                                key={`line-${i}`}
                                                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                                stroke="rgb(245,158,11)"
                                                strokeWidth="5"
                                                strokeLinecap="round"
                                                opacity="0.8"
                                            />
                                        )
                                    })}

                                    {/* Number markers inside circles in drawing order */}
                                    {points.map((pt, index) => {
                                        const pos = getPointPos(pt)
                                        return (
                                            <g key={`marker-${index}`}>
                                                <circle
                                                    cx={pos.x} cy={pos.y} r="18"
                                                    fill="rgba(245,158,11,0.2)"
                                                    stroke="rgb(245,158,11)"
                                                    strokeWidth="1.5"
                                                />
                                                <text
                                                    x={pos.x} y={pos.y + 4}
                                                    textAnchor="middle"
                                                    fill="rgb(245,158,11)"
                                                    className="text-xs font-black"
                                                >
                                                    {index + 1}
                                                </text>
                                            </g>
                                        )
                                    })}

                                    {/* Standard grid points */}
                                    {GRID_POINTS.map(i => {
                                        const pos = getPointPos(i)
                                        const isActive = points.includes(i)
                                        if (isActive) return null // Handled above with numbers
                                        return (
                                            <g key={i}>
                                                <circle
                                                    cx={pos.x} cy={pos.y} r="16"
                                                    className="fill-foreground/[0.02] stroke-foreground/10"
                                                    strokeWidth="1.5"
                                                />
                                                <circle
                                                    cx={pos.x} cy={pos.y} r="4"
                                                    className="fill-foreground/30"
                                                />
                                            </g>
                                        )
                                    })}
                                </svg>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
                        <Lock className="w-5 h-5 opacity-40 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-wider">Credencial Ocultada por Segurança</span>
                    </div>
                )}
            </div>
        </div>
    )
}
