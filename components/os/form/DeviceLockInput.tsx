'use client'

import { useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Segmented from '@/components/ui/Segmented'
import type { DeviceLock } from '@/lib/os/notes'

type Mode = 'none' | 'pin' | 'pattern'

const pos = (i: number) => ({ x: (i % 3) * 100 + 50, y: Math.floor(i / 3) * 100 + 50 })

/** Android-style 3×3 pattern drawn with a finger or mouse. */
function PatternPad({ value, onChange }: { value: number[]; onChange: (points: number[]) => void }) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [drawing, setDrawing] = useState<number[] | null>(null)
    const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
    const points = drawing ?? value

    const at = (e: React.PointerEvent) => {
        const r = svgRef.current!.getBoundingClientRect()
        return { x: ((e.clientX - r.left) / r.width) * 300, y: ((e.clientY - r.top) / r.height) * 300 }
    }
    const hit = (p: { x: number; y: number }) => {
        for (let i = 0; i < 9; i++) if (Math.hypot(p.x - pos(i).x, p.y - pos(i).y) < 34) return i
        return null
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <svg
                ref={svgRef}
                viewBox="0 0 300 300"
                className="w-60 h-60 max-w-full touch-none select-none"
                role="img"
                aria-label={points.length ? `Padrão com ${points.length} pontos` : 'Desenhe o padrão'}
                onPointerDown={e => {
                    const p = at(e); const i = hit(p)
                    if (i === null) return
                    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                    setDrawing([i]); setCursor(p)
                }}
                onPointerMove={e => {
                    if (!drawing) return
                    const p = at(e); setCursor(p)
                    const i = hit(p)
                    if (i !== null && !drawing.includes(i)) setDrawing([...drawing, i])
                }}
                onPointerUp={() => {
                    if (drawing) onChange(drawing)
                    setDrawing(null); setCursor(null)
                }}
            >
                {points.slice(1).map((p, i) => {
                    const a = pos(points[i]); const b = pos(p)
                    return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(var(--primary))" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
                })}
                {drawing && cursor && points.length > 0 && (
                    <line x1={pos(points[points.length - 1]).x} y1={pos(points[points.length - 1]).y} x2={cursor.x} y2={cursor.y} stroke="hsl(var(--primary))" strokeWidth={4} strokeLinecap="round" opacity={0.3} />
                )}
                {Array.from({ length: 9 }, (_, i) => {
                    const on = points.includes(i)
                    const order = points.indexOf(i)
                    return (
                        <g key={i}>
                            <circle cx={pos(i).x} cy={pos(i).y} r={26} fill={on ? 'hsl(var(--primary) / 0.14)' : 'hsl(var(--foreground) / 0.05)'} />
                            <circle cx={pos(i).x} cy={pos(i).y} r={on ? 9 : 6} fill={on ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.35)'} />
                            {on && order === 0 && <circle cx={pos(i).x} cy={pos(i).y} r={16} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />}
                        </g>
                    )
                })}
            </svg>
            <p className="text-[13px] text-muted-foreground text-center">
                {points.length ? `${points.length} pontos · o círculo marca o início` : 'Desenhe o padrão como o cliente faz no aparelho'}
            </p>
            {points.length > 0 && (
                <button type="button" onClick={() => onChange([])} className="h-9 px-4 rounded-full text-[15px] font-medium text-primary hover:bg-primary/10">
                    Desenhar de novo
                </button>
            )}
        </div>
    )
}

/**
 * Unlock code the technician needs: none, a PIN/password, or an Android
 * pattern. Stored in the order's internal notes (see lib/os/notes).
 */
export default function DeviceLockInput({ value, onChange }: { value: DeviceLock | null; onChange: (lock: DeviceLock | null) => void }) {
    const [mode, setMode] = useState<Mode>(value?.type ?? 'none')
    const [show, setShow] = useState(false)

    const choose = (m: Mode) => {
        setMode(m)
        if (m === 'none') onChange(null)
        else if (value?.type !== m) onChange(null)
    }

    return (
        <div className="space-y-4">
            <Segmented<Mode>
                value={mode}
                onChange={choose}
                ariaLabel="Tipo de bloqueio"
                className="w-full [&>button]:flex-1"
                options={[
                    { value: 'none', label: 'Sem senha' },
                    { value: 'pin', label: 'PIN ou senha' },
                    { value: 'pattern', label: 'Padrão' },
                ]}
            />
            {mode === 'pin' && (
                <div className="rounded-2xl bg-card border border-border/60 px-4 py-3">
                    <label htmlFor="os-lock-pin" className="block text-[13px] text-muted-foreground mb-1">Senha do aparelho</label>
                    <div className="flex items-center gap-2">
                        <input
                            id="os-lock-pin"
                            type={show ? 'text' : 'password'}
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            value={value?.type === 'pin' ? value.value : ''}
                            onChange={e => onChange(e.target.value ? { type: 'pin', value: e.target.value } : null)}
                            placeholder="Ex.: 1234"
                            className="flex-1 min-w-0 bg-transparent text-[22px] tracking-[0.2em] font-medium tabular-nums outline-none placeholder:tracking-normal placeholder:text-[17px] placeholder:text-muted-foreground/60"
                        />
                        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06]">
                            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            )}
            {mode === 'pattern' && (
                <div className="rounded-2xl bg-card border border-border/60 py-5 px-4">
                    <PatternPad
                        value={value?.type === 'pattern' && value.value ? value.value.split('-').map(Number) : []}
                        onChange={pts => onChange(pts.length ? { type: 'pattern', value: pts.join('-') } : null)}
                    />
                </div>
            )}
            <p className="px-4 text-[13px] text-muted-foreground">
                {mode === 'none' ? 'Se o aparelho não tem senha ou o cliente preferiu não informar.' : 'Fica só na OS, visível para a equipe da loja.'}
            </p>
        </div>
    )
}
