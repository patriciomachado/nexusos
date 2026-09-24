'use client'

import Link from 'next/link'
import { Sparkles, Calendar, ArrowRight, Wand2, Video, Zap, Play } from 'lucide-react'
import { BRAZILIAN_SEASONAL_EVENTS } from '@/lib/studio-events'

export default function StudioDashboardWidget() {
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    // Find closest upcoming seasonal event
    const upcomingEvent = BRAZILIAN_SEASONAL_EVENTS.find(e => 
        (e.month === currentMonth && e.day >= currentDay) || e.month > currentMonth
    ) || BRAZILIAN_SEASONAL_EVENTS[0]

    return (
        <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-5">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
                        <Sparkles className="w-6 h-6 animate-pulse text-amber-400" />
                    </div>
                    <div>
                        <span className="text-[11px] font-black uppercase text-amber-400 tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            Novo Módulo AI
                        </span>
                        <h3 className="text-lg font-black tracking-tight text-foreground mt-0.5">Nexus Studio</h3>
                    </div>
                </div>

                <Link
 href="/studio"
 className="px-4 py-2.5 bg-primary text-black rounded-2xl text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 group shrink-0"
 >
                    <Wand2 className="w-4 h-4" />
                    Abrir Nexus Studio
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {/* 1. Daily Video Hook Recommendation */}
                <div className="bg-background/80 border border-border rounded-2xl p-4 space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-widest">
                            <Zap className="w-4 h-4" />
                            Ideia de Vídeo Recomendada para Hoje
                        </div>
                        <p className="text-xs font-bold text-foreground">
                            "🚨 NUNCA coloque seu celular no arroz se ele cair na água! Veja o que acontece de verdade..."
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                            Demonstre o banho ultrassônico de desoxidação na bancada e previna a perda total do aparelho do cliente.
                        </p>
                    </div>

                    <Link
                        href="/studio?topic=Celular%20molhado%20no%20arroz"
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 pt-1"
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                        Gerar Roteiro com Claude AI
                    </Link>
                </div>

                {/* 2. Upcoming Seasonal Event Trigger */}
                <div className="bg-background/80 border border-border rounded-2xl p-4 space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-black text-primary uppercase tracking-widest">
                                <Calendar className="w-4 h-4" />
                                Próxima Data no Calendário Sazonal
                            </span>
                            <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                Dia {upcomingEvent.day}/{upcomingEvent.month}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-foreground">
                            {upcomingEvent.title} ({upcomingEvent.badge})
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {upcomingEvent.description}
                        </p>
                    </div>

                    <Link
                        href={`/studio?topic=${encodeURIComponent(upcomingEvent.suggestedTopic)}`}
                        className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 pt-1"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Criar Campanha desta Data
                    </Link>
                </div>
            </div>
        </div>
    )
}
