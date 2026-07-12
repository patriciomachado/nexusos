'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ShieldCheck, ChevronLeft, ChevronRight, Lock, Grid3X3, Delete, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Pattern Grid (Android-style) ── */
const GRID_POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

function getPointPos(index: number) {
    const col = index % 3
    const row = Math.floor(index / 3)
    return { x: col * 100 + 50, y: row * 100 + 50 }
}

interface PatternGridProps {
    pattern: number[]
    onChange: (pattern: number[]) => void
}

function PatternGrid({ pattern, onChange }: PatternGridProps) {
    const [drawing, setDrawing] = useState(false)
    const [currentPattern, setCurrentPattern] = useState<number[]>(pattern)
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    // Sync state with parent prop updates
    useEffect(() => {
        setCurrentPattern(pattern)
    }, [pattern])

    function getSVGPos(e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } {
        const rect = svgRef.current!.getBoundingClientRect()
        return {
            x: ((e.clientX - rect.left) / rect.width) * 300,
            y: ((e.clientY - rect.top) / rect.height) * 300,
        }
    }

    function getClosestPoint(x: number, y: number): number | null {
        for (let i = 0; i < 9; i++) {
            const p = getPointPos(i)
            if (Math.hypot(x - p.x, y - p.y) < 28) return i
        }
        return null
    }

    function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
        const pos = getSVGPos(e)
        const pt = getClosestPoint(pos.x, pos.y)
        if (pt !== null) {
            setDrawing(true)
            setCurrentPattern([pt])
            setCursorPos(pos)
            ;(e.target as Element).setPointerCapture(e.pointerId)
        }
    }

    function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
        if (!drawing) return
        const pos = getSVGPos(e)
        setCursorPos(pos)
        const pt = getClosestPoint(pos.x, pos.y)
        if (pt !== null && !currentPattern.includes(pt)) {
            setCurrentPattern(prev => [...prev, pt])
        }
    }

    function handlePointerUp() {
        if (!drawing) return
        setDrawing(false)
        setCursorPos(null)
        onChange(currentPattern)
    }

    const points = currentPattern

    return (
        <div className="flex flex-col items-center gap-3">
            <svg
                ref={svgRef}
                viewBox="0 0 300 300"
                className="w-56 h-56 touch-none select-none cursor-pointer"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Lines between connected points */}
                {points.slice(0, -1).map((pt, i) => {
                    const a = getPointPos(pt)
                    const b = getPointPos(points[i + 1])
                    return (
                        <line
                            key={`line-${i}`}
                            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                            stroke="rgb(99,102,241)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            opacity="0.6"
                        />
                    )
                })}

                {/* Line to cursor while drawing */}
                {drawing && cursorPos && points.length > 0 && (() => {
                    const last = getPointPos(points[points.length - 1])
                    return (
                        <line
                            x1={last.x} y1={last.y}
                            x2={cursorPos.x} y2={cursorPos.y}
                            stroke="rgb(99,102,241)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            opacity="0.3"
                            strokeDasharray="4 4"
                        />
                    )
                })()}

                {/* Dots */}
                {GRID_POINTS.map(i => {
                    const pos = getPointPos(i)
                    const isActive = points.includes(i)
                    return (
                        <g key={i}>
                            <circle
                                cx={pos.x} cy={pos.y} r="16"
                                className={cn(
                                    "transition-all duration-200",
                                    isActive
                                        ? "fill-indigo-500/15 stroke-indigo-500/50"
                                        : "fill-foreground/[0.03] stroke-foreground/15"
                                )}
                                strokeWidth="1.5"
                            />
                            <circle
                                cx={pos.x} cy={pos.y} r={isActive ? 6 : 4}
                                className={cn(
                                    "transition-all duration-200",
                                    isActive ? "fill-indigo-500" : "fill-foreground/30"
                                )}
                            />
                        </g>
                    )
                })}
            </svg>

            <div className="flex items-center gap-2">
                {points.map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-indigo-500/60" />
                ))}
                {points.length === 0 && (
                    <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
                        Arraste para criar o padrão
                    </span>
                )}
            </div>

            {points.length > 0 && (
                <button
                    type="button"
                    onClick={() => { setCurrentPattern([]); onChange([]) }}
                    className="text-[9px] font-black text-muted-foreground/40 hover:text-rose-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                    <Delete className="w-3 h-3" />
                    Limpar padrão
                </button>
            )}
        </div>
    )
}

/* ── PIN Pad ── */
const PIN_BUTTONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

function PinPad({ pin, onChange }: { pin: string; onChange: (pin: string) => void }) {
    const [showPin, setShowPin] = useState(false)

    function handleKey(key: string) {
        if (key === '⌫') { onChange(pin.slice(0, -1)); return }
        if (key === '') return
        if (pin.length >= 8) return
        onChange(pin + key)
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* PIN display */}
            <div className="relative flex items-center gap-2">
                {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black border transition-all ${i < pin.length
                            ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                            : 'bg-white/5 border-white/5 text-muted-foreground/20'
                            }`}
                    >
                        {i < pin.length ? (showPin ? pin[i] : '●') : ''}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => setShowPin(p => !p)}
                    className="ml-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 w-48">
                {PIN_BUTTONS.map((key, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => handleKey(key)}
                        disabled={key === ''}
                        className={`h-12 rounded-xl font-black text-lg transition-all ${key === ''
                            ? 'invisible'
                            : key === '⌫'
                                ? 'bg-white/5 border border-white/5 text-rose-400 hover:bg-rose-500/10 text-sm'
                                : 'bg-white/5 border border-white/5 text-foreground hover:bg-white/10 hover:border-white/10'
                            }`}
                    >
                        {key}
                    </button>
                ))}
            </div>

            {pin.length > 0 && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="text-[9px] font-black text-muted-foreground/40 hover:text-rose-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                    <Delete className="w-3 h-3" />
                    Limpar senha
                </button>
            )}
        </div>
    )
}

/* ── Main Step ── */
interface Props {
    devicePassword: string
    devicePasswordType: 'pin' | 'pattern'
    onChangePassword: (val: string) => void
    onChangePasswordType: (type: 'pin' | 'pattern') => void
    onNext: () => void
    onBack: () => void
}

export default function StepSegurancaForm({
    devicePassword, devicePasswordType,
    onChangePassword, onChangePasswordType,
    onNext, onBack
}: Props) {
    const [skip, setSkip] = useState(!devicePassword && devicePassword !== '')

    return (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Segurança do Dispositivo</h2>
                <p className="text-sm text-muted-foreground">Registre a senha para acesso técnico (opcional)</p>
            </div>

            {/* Card */}
            <div className="bg-card/40 border border-white/5 rounded-[2rem] p-6 md:p-8 backdrop-blur-xl shadow-inner space-y-6">
                {/* Type toggle */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    <button
                        type="button"
                        onClick={() => onChangePasswordType('pin')}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${devicePasswordType === 'pin'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                            : 'text-muted-foreground/40 hover:text-muted-foreground'
                            }`}
                    >
                        <Lock className="w-3.5 h-3.5" />
                        Senha / PIN
                    </button>
                    <button
                        type="button"
                        onClick={() => onChangePasswordType('pattern')}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${devicePasswordType === 'pattern'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                            : 'text-muted-foreground/40 hover:text-muted-foreground'
                            }`}
                    >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        Padrão (Android)
                    </button>
                </div>

                {/* Input area */}
                <div className="flex justify-center py-4">
                    {devicePasswordType === 'pin' ? (
                        <PinPad
                            pin={devicePassword}
                            onChange={onChangePassword}
                        />
                    ) : (
                        <PatternGrid
                            pattern={devicePassword ? devicePassword.split('-').map(Number) : []}
                            onChange={(pts) => onChangePassword(pts.join('-'))}
                        />
                    )}
                </div>

                {/* Skip notice */}
                <p className="text-center text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                    Este campo é opcional. A senha fica registrada apenas na OS.
                </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 text-muted-foreground"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    className="px-8 py-4 rounded-2xl bg-amber-500 text-black text-sm font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-3"
                >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
