'use client'

import { Sparkles, ChevronRight, Clock, ShieldCheck, Zap, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground ">Plano & Licenciamento</h2>
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">Gestão de cotas e infraestrutura</p>
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Block 1: Plan Details */}
                <div className="p-8 rounded-3xl bg-card/40 border border-white/5 backdrop-blur-3xl shadow-xl relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full group-hover:bg-indigo-500/10 transition-colors duration-700" />
                    
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Plano Ativo</span>
                            <div className={cn(
                                "flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border",
                                isActive || isTrial
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            )}>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    isActive || isTrial ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                )} />
                                {isTrial ? 'PRO Trials' : isActive ? 'Ativo' : 'Inativo'}
                            </div>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-foreground tracking-tighter capitalize">{company.subscription_plan}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 uppercase font-bold tracking-tight">Assinatura do Workspace</p>
                        </div>
                    </div>
                </div>

                {/* Block 2: Talent Quota / Usage */}
                <div className="p-8 rounded-3xl bg-card/40 border border-white/5 backdrop-blur-3xl shadow-xl relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full group-hover:bg-primary/10 transition-colors duration-700" />
                    
                    <div className="space-y-6 relative z-10 w-full">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Cotas de Talentos</span>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-muted-foreground">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black uppercase text-muted-foreground">Usuários no Time</span>
                                <span className="text-2xl font-black text-foreground tracking-tighter">02 <span className="text-muted-foreground text-lg">/ {company.max_users.toString().padStart(2, '0')}</span></span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                    style={{ width: `${(2 / company.max_users) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Block 3: Trial / Manage Actions */}
                <div className="p-8 rounded-3xl bg-card/40 border border-white/5 backdrop-blur-3xl shadow-xl relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full group-hover:bg-emerald-500/10 transition-colors duration-700" />
                    
                    <div className="space-y-4 relative z-10 w-full h-full flex flex-col justify-between">
                        {isTrial && company.trial_ends_at ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Período de Testes</span>
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                        <Clock className="w-4 h-4 animate-spin-slow" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[11px] font-black uppercase text-muted-foreground">Tempo Restante</span>
                                    <span className="text-2xl font-black text-foreground tracking-tighter">
                                        {Math.max(0, Math.ceil((new Date(company.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Dias
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Gerenciar</span>
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                </div>
                                <span className="text-[11px] font-black uppercase text-muted-foreground block leading-tight">Configurações de faturamento e upgrades</span>
                            </div>
                        )}

                        <div className="pt-2">
                            <Link href="/settings/subscription" className="w-full h-12 rounded-2xl bg-foreground text-background font-black text-[13px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 group">
                                GERENCIAR
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
