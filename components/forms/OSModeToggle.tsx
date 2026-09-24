'use client'

import { Zap, Map } from 'lucide-react'

interface Props {
    mode: 'quick' | 'guided'
    onChange: (mode: 'quick' | 'guided') => void
}

export default function OSModeToggle({ mode, onChange }: Props) {
    return (
        <div className="flex items-center gap-3 px-4 md:px-0 mb-4">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest hidden sm:block">Modo</span>
            <div className="flex gap-1 p-1 bg-white/5 border border-white/5 rounded-xl">
                <button
 type="button"
 onClick={() => onChange('quick')}
 className={`px-4 py-2 rounded-lg text-[13px] font-black transition-all flex items-center gap-1.5 ${mode === 'quick'
 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
 : 'text-muted-foreground hover:text-muted-foreground'
 }`}
 >
                    <Zap className="w-3 h-3" />
                    Rápido
                </button>
                <button
 type="button"
 onClick={() => onChange('guided')}
 className={`px-4 py-2 rounded-lg text-[13px] font-black transition-all flex items-center gap-1.5 ${mode === 'guided'
 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
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
