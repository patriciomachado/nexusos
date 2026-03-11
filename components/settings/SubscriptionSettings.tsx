'use client'

import { Sparkles, ChevronRight, Clock, ShieldCheck, Zap, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubscriptionSettingsProps {
    company: {
        subscription_plan: string
        subscription_status: string
        max_users: number
        trial_ends_at: string | null
    }
}

export default function SubscriptionSettings({ company }: SubscriptionSettingsProps) {
    const isTrial = company.subscription_status === 'trial'
    const isActive = company.subscription_status === 'active'

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">Plano & Licenciamento</h2>
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Gestão de cotas e infraestrutura</p>
                </div>
            </div>

            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-indigo-500/10 via-card/40 to-card/40 border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-colors duration-700" />

                <div className="relative z-10 space-y-10">
                    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-white/5 border border-white/5 shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Plano Atual</span>
                                <p className="text-2xl font-black text-foreground tracking-tight">{company.subscription_plan}</p>
                            </div>
                        </div>
                        <div className={cn(
                            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border",
                            isActive || isTrial
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                                : 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-lg shadow-rose-500/10'
                        )}>
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isActive || isTrial ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            )} />
                            {isTrial ? 'PRO Trials' : isActive ? 'Enterprise Active' : 'Suspensa'}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-8 px-2">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground/40 italic">
                                    <Users className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cotas de Talentos</span>
                                </div>
                                <span className="text-lg font-black text-foreground tracking-tighter">02 / {company.max_users.toString().padStart(2, '0')}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                    style={{ width: `${(2 / company.max_users) * 100}%` }}
                                />
                            </div>
                        </div>

                        {isTrial && company.trial_ends_at && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground/40 italic">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Expira em</span>
                                    </div>
                                    <span className="text-lg font-black text-foreground tracking-tighter">
                                        {Math.max(0, Math.ceil((new Date(company.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Dias
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500/40 w-[60%] rounded-full" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button className="w-full h-16 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-foreground/10 flex items-center justify-center gap-3 group">
                            UPGRADE DE INFRAESTRUTURA
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
