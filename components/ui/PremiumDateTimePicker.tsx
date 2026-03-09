'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
    value: string
    onChange: (val: string) => void
    label?: string
}

export default function PremiumDateTimePicker({ value, onChange, label }: Props) {
    const [showCustom, setShowCustom] = useState(false)

    // Helper to format ISO string to human readable preview
    const formatPreview = (val: string) => {
        if (!val) return 'Nenhum horário selecionado'
        const date = new Date(val)
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }) + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    const presets = [
        {
            label: 'Hoje Agora',
            getValue: () => new Date().toISOString().slice(0, 16),
            color: 'bg-primary/10 text-primary border-primary/20'
        },
        {
            label: 'Hoje Tarde (14h)',
            getValue: () => {
                const d = new Date()
                d.setHours(14, 0, 0, 0)
                return d.toISOString().slice(0, 16)
            },
            color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        },
        {
            label: 'Amanhã Manhã',
            getValue: () => {
                const d = new Date()
                d.setDate(d.getDate() + 1)
                d.setHours(9, 0, 0, 0)
                return d.toISOString().slice(0, 16)
            },
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }
    ]

    return (
        <div className="space-y-3">
            {label && (
                <label className="block text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2">
                    {label}
                </label>
            )}

            <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                    <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                            onChange(preset.getValue())
                            setShowCustom(false)
                        }}
                        className={cn(
                            "group relative p-2.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 text-center overflow-hidden",
                            value.startsWith(preset.getValue().slice(0, 10)) && !showCustom
                                ? preset.color + " ring-1 ring-border/50"
                                : "bg-muted/30 border-border/50 text-muted-foreground/50 hover:bg-muted/50 hover:border-border"
                        )}
                    >
                        <div className="flex flex-col gap-0.5 relative z-10">
                            <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">
                                {preset.label.split(' ')[0]}
                            </span>
                            <span className="text-[10px] font-bold white-text transition-colors group-hover:text-white truncate">
                                {preset.label.split(' ').slice(1).join(' ')}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="relative group">
                <button
                    type="button"
                    onClick={() => setShowCustom(!showCustom)}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-2xl border transition-all",
                        showCustom
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-muted/30 border-border/50 text-muted-foreground/50 hover:bg-muted/50 hover:border-border"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                            {showCustom ? 'Customizado' : 'Outra Data'}
                        </span>
                    </div>
                    <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showCustom && "rotate-90")} />
                </button>

                {showCustom && (
                    <div className="mt-2 p-3 rounded-2xl bg-card border border-border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                        <input
                            type="datetime-local"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-muted/40 border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono text-xs"
                        />
                    </div>
                )}
            </div>

            {value && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-muted/20 border border-border/50 animate-in fade-in duration-500">
                    <Clock className="w-3 h-3 text-primary/60" />
                    <p className="text-[10px] font-medium text-muted-foreground/60 first-letter:uppercase truncate">
                        {formatPreview(value)}
                    </p>
                </div>
            )}
        </div>
    )
}
