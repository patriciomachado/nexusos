'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Play, Pause, RotateCcw, Type, Gauge, FlipHorizontal, Sparkles } from 'lucide-react'
import { StudioScript } from '@/types/studio'
import { cn } from '@/lib/utils'

interface TeleprompterModalProps {
    isOpen: boolean
    onClose: () => void
    script: StudioScript | null
}

export default function TeleprompterModal({ isOpen, onClose, script }: TeleprompterModalProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState(2) // 1 to 5
    const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
    const [isMirrored, setIsMirrored] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let interval: any = null
        if (isPlaying && scrollRef.current) {
            interval = setInterval(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop += speed
                }
            }, 30)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isPlaying, speed])

    if (!isOpen || !script) return null

    const resetScroll = () => {
        setIsPlaying(false)
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0
        }
    }

    const fontClasses = {
        sm: 'text-lg md:text-xl leading-relaxed',
        md: 'text-xl md:text-2xl leading-relaxed',
        lg: 'text-2xl md:text-3xl leading-relaxed',
        xl: 'text-3xl md:text-4xl leading-loose font-extrabold'
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col backdrop-blur-2xl animate-in fade-in duration-300">
            {/* Header Controls */}
            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-black/40 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/20 rounded-2xl text-primary border border-primary/30">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white truncate max-w-xs md:max-w-md">{script.title}</h2>
                        <p className="text-xs text-primary font-semibold">Modo Teleprompter • Olhe para a Câmera</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mirror Mode Button */}
                    <button 
                        onClick={() => setIsMirrored(!isMirrored)}
                        className={cn(
                            "p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold",
                            isMirrored ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 border-border/60 text-white/70 hover:bg-foreground/[0.05]"
                        )}
                        title="Espelhar texto (câmera frontal)"
                    >
                        <FlipHorizontal className="w-4 h-4" />
                        <span className="hidden sm:inline">Espelhar</span>
                    </button>

                    {/* Font Size Selector */}
                    <div className="flex items-center bg-foreground/[0.03] border border-border/60 rounded-xl p-1">
                        <Type className="w-4 h-4 ml-2 text-white/50" />
                        {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
                            <button
 key={size}
 onClick={() => setFontSize(size)}
 className={cn(
 "px-2.5 py-1 text-xs font-bold rounded-lg transition",
 fontSize === size ? "bg-primary text-primary-foreground" : "text-white/60 hover:text-white"
 )}
 >
                                {size}
                            </button>
                        ))}
                    </div>

                    {/* Speed Control */}
                    <div className="flex items-center bg-foreground/[0.03] border border-border/60 rounded-xl px-3 py-1 gap-2">
                        <Gauge className="w-4 h-4 text-white/50 shrink-0" />
                        <input 
                            type="range"
                            min="1"
                            max="5"
                            value={speed}
                            onChange={e => setSpeed(Number(e.target.value))}
                            className="w-20 accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-mono text-primary font-bold">{speed}x</span>
                    </div>

                    {/* Close */}
                    <button 
                        onClick={onClose}
                        className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition text-white ml-2"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Prompter Area */}
            <div 
                ref={scrollRef}
                className={cn(
                    "flex-1 overflow-y-auto px-6 md:px-24 py-16 scroll-smooth custom-scrollbar",
                    isMirrored && "scale-x-[-1]"
                )}
            >
                <div className="max-w-4xl mx-auto space-y-12 pb-64">
                    {/* Gancho Section */}
                    <div className="p-6 md:p-8 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-amber-400 font-semibold text-xs">
                            <span>⚡ 0s - 3s | GANCHO VIRAL (ATENÇÃO DA CÂMERA)</span>
                        </div>
                        <p className={cn("font-bold text-amber-200", fontClasses[fontSize])}>
                            "{script.hook_3s}"
                        </p>
                    </div>

                    {/* Roteiro da Bancada Section */}
                    <div className="p-6 md:p-8 bg-blue-500/10 border-2 border-blue-500/30 rounded-2xl space-y-4">
                        <div className="text-blue-400 font-semibold text-xs">
                            <span>🛠️ DEMONSTRAÇÃO NA BANCADA / CORPO DO VÍDEO</span>
                        </div>
                        <div className={cn("whitespace-pre-line text-white font-medium", fontClasses[fontSize])}>
                            {script.body_script}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="p-6 md:p-8 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl space-y-3">
                        <div className="text-emerald-400 font-semibold text-xs">
                            <span>📣 CHAMADA PARA AÇÃO (CTA / VENDAS)</span>
                        </div>
                        <p className={cn("font-bold text-emerald-200", fontClasses[fontSize])}>
                            "{script.cta_text}"
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Playback Control Bar */}
            <div className="p-4 border-t border-border/60 bg-black/60 flex items-center justify-center gap-4 shrink-0">
                <button
                    onClick={resetScroll}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition text-white/80 flex items-center gap-2 font-bold text-sm"
                >
                    <RotateCcw className="w-5 h-5" />
                    Reiniciar
                </button>

                <button
 onClick={() => setIsPlaying(!isPlaying)}
 className={cn(
 "px-8 py-4 rounded-2xl font-black text-base flex items-center gap-3 transition active:scale-95",
 isPlaying 
 ? "bg-amber-500 text-black hover:bg-amber-400" 
 : "bg-primary text-primary-foreground hover:bg-primary/90"
 )}
 >
                    {isPlaying ? (
                        <>
                            <Pause className="w-6 h-6 fill-current" />
                            Pausar Rolagem
                        </>
                    ) : (
                        <>
                            <Play className="w-6 h-6 fill-current" />
                            Iniciar Teleprompter
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
