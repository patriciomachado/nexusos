'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink, Plus, Hash } from 'lucide-react'

interface Props {
    orderId: string
    orderNumber?: string
}

export default function StepOSCriada({ orderId, orderNumber }: Props) {
    const router = useRouter()
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Confetti-like particle animation
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight

        const particles: Array<{
            x: number; y: number; vx: number; vy: number;
            color: string; size: number; opacity: number; rotation: number; vr: number
        }> = []

        const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

        for (let i = 0; i < 60; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 1.5) * 12,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                opacity: 1,
                rotation: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 0.2
            })
        }

        let animId: number
        function animate() {
            ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
            let alive = false
            for (const p of particles) {
                p.x += p.vx
                p.y += p.vy
                p.vy += 0.3
                p.opacity -= 0.012
                p.rotation += p.vr
                if (p.opacity > 0) {
                    alive = true
                    ctx!.save()
                    ctx!.translate(p.x, p.y)
                    ctx!.rotate(p.rotation)
                    ctx!.globalAlpha = p.opacity
                    ctx!.fillStyle = p.color
                    ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2)
                    ctx!.restore()
                }
            }
            if (alive) animId = requestAnimationFrame(animate)
        }
        animate()
        return () => cancelAnimationFrame(animId)
    }, [])

    return (
        <div className="max-w-lg mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center py-8">
            {/* Canvas confetti */}
            <div className="relative h-40 -mb-32">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            </div>

            {/* Success icon */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.25)] animate-pulse">
                    <CheckCircle2 className="w-12 h-12" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-foreground tracking-tight">OS Criada!</h2>
                    <p className="text-muted-foreground text-sm">Ordem de serviço aberta com sucesso</p>
                </div>

                {orderNumber && (
                    <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-5 py-3 rounded-2xl">
                        <Hash className="w-4 h-4 text-indigo-400" />
                        <span className="text-lg font-black text-indigo-300 tracking-widest">{orderNumber}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
                <button
 type="button"
 onClick={() => router.push(`/service-orders/${orderId}`)}
 className="w-full px-8 py-4 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
 >
                    <ExternalLink className="w-4 h-4" />
                    Ver Ordem de Serviço
                </button>
                <button
 type="button"
 onClick={() => router.push('/service-orders/new')}
 className="w-full px-8 py-4 rounded-2xl border border-white/10 bg-white/5 text-foreground/60 font-black hover:bg-white/10 transition-all flex items-center justify-center gap-3"
 >
                    <Plus className="w-4 h-4" />
                    Nova OS
                </button>
                <button
 type="button"
 onClick={() => router.push('/service-orders')}
 className="w-full text-[13px] text-muted-foreground hover:text-muted-foreground font-black transition-colors py-2"
 >
                    Voltar para lista
                </button>
            </div>
        </div>
    )
}
