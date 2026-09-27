'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FlipHorizontal, Minus, Pause, Play, Plus, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Full-screen scrolling script for recording the video on the phone. */
export default function Teleprompter({ open, onClose, title, text }: { open: boolean; onClose: () => void; title: string; text: string }) {
    const [playing, setPlaying] = useState(false)
    const [speed, setSpeed] = useState(2)
    const [size, setSize] = useState(34)
    const [mirror, setMirror] = useState(false)
    const scroller = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open || !playing) return
        let frame = 0
        let last = performance.now()
        const tick = (now: number) => {
            const el = scroller.current
            if (el) {
                el.scrollTop += (speed * 18 * (now - last)) / 1000
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setPlaying(false)
            }
            last = now
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [open, playing, speed])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open || typeof document === 'undefined') return null

    const btn = 'w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors'

    return createPortal(
        <div className="fixed inset-0 z-[1000] bg-black text-white flex flex-col" role="dialog" aria-modal="true" aria-label="Teleprompter">
            <div className="flex items-center gap-2 px-4 pb-3 border-b border-white/10" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <p className="flex-1 min-w-0 text-[15px] font-semibold truncate">{title}</p>
                <button type="button" onClick={onClose} aria-label="Fechar" className={btn}><X aria-hidden className="w-5 h-5" /></button>
            </div>

            <div ref={scroller} className="flex-1 overflow-y-auto px-6 sm:px-16" onClick={() => setPlaying(p => !p)}>
                <div className="h-[35dvh]" aria-hidden />
                <p className={cn('max-w-3xl mx-auto whitespace-pre-wrap font-semibold leading-[1.45]', mirror && '-scale-x-100')} style={{ fontSize: size }}>{text}</p>
                <div className="h-[60dvh]" aria-hidden />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-[40%] h-px bg-red-500/60" aria-hidden />

            <div className="flex items-center justify-center gap-2 px-4 pt-3 border-t border-white/10" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                <button type="button" onClick={() => { setPlaying(false); scroller.current?.scrollTo({ top: 0 }) }} aria-label="Voltar ao início" className={btn}><RotateCcw aria-hidden className="w-5 h-5" /></button>
                <button type="button" onClick={() => setSpeed(s => Math.max(1, s - 1))} aria-label="Mais devagar" className={btn}><Minus aria-hidden className="w-5 h-5" /></button>
                <button type="button" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pausar' : 'Rolar'} className="w-14 h-14 rounded-full flex items-center justify-center bg-white text-black">
                    {playing ? <Pause aria-hidden className="w-6 h-6" /> : <Play aria-hidden className="w-6 h-6 ml-0.5" />}
                </button>
                <button type="button" onClick={() => setSpeed(s => Math.min(8, s + 1))} aria-label="Mais rápido" className={btn}><Plus aria-hidden className="w-5 h-5" /></button>
                <button type="button" onClick={() => setSize(s => (s >= 52 ? 26 : s + 6))} aria-label="Tamanho da letra" className={cn(btn, 'text-[15px] font-bold')}>Aa</button>
                <button type="button" onClick={() => setMirror(m => !m)} aria-label="Espelhar" aria-pressed={mirror} className={cn(btn, mirror && 'bg-white/30')}><FlipHorizontal aria-hidden className="w-5 h-5" /></button>
            </div>
        </div>,
        document.body
    )
}
