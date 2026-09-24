'use client'

import { Zap, Map } from 'lucide-react'

interface Props {
    mode: 'quick' | 'guided'
    onChange: (mode: 'quick' | 'guided') => void
}

export default function OSModeToggle({ mode, onChange }: Props) {
    return (
        <div className="flex items-center gap-3 px-4 md:px-0 mb-4">
            <span className="text-xs font-semibold text-muted-foreground hidden sm:block">Modo</span>
            <div className="flex gap-1 p-1 bg-foreground/[0.03] border border-border/60 rounded-xl">
                <button
 type="button"
 onClick={() => onChange('quick')}
 className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 ${mode === 'quick'
 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 '
 : 'text-muted-foreground hover:text-muted-foreground'
 }`}
 >
                    <Zap className="w-3 h-3" />
                    Rápido
                </button>
                <button
 type="button"
 onClick={() => onChange('guided')}
 className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 ${mode === 'guided'
 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 '
 : 'text-muted-foreground hover:text-muted-foreground'
 }`}
 >
                    <Map className="w-3 h-3" />
                    Guiado
                </button>
            </div>
            <p className="text-[11px] text-muted-foreground font-bold hidden md:block">
                {mode === 'quick' ? 'Formulário completo em uma tela' : 'Passo a passo para check-in completo'}
            </p>
        </div>
    )
}
