'use client'

import { ClipboardList, Zap, Clock, CheckCircle2, AlertCircle, Circle, Wrench, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    aberta:          { label: 'Aberta',     color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    icon: Circle },
    agendada:        { label: 'Agendada',   color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20', icon: Clock },
    em_andamento:    { label: 'Em andamento', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Wrench },
    aguardando_pecas:{ label: 'Aguardando', color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertCircle },
    concluida:       { label: 'Concluída',  color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20',   icon: CheckCircle2 },
    faturada:        { label: 'Faturada',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    cancelada:       { label: 'Cancelada',  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',      icon: AlertCircle },
}

interface ServiceOrder {
    id: string
    created_at: string
    title: string
    status: string
    equipment_description: string
    customers?: { name: string } | null
}

interface EmployeeDashboardProps {
    role: string
    recentOS: ServiceOrder[]
}

const ROLE_LABEL: Record<string, string> = {
    technician: 'Técnico',
    attendant:  'Atendente',
    cashier:    'Caixa',
    manager:    'Gerente',
    talento:    'Talento',
}

export default function EmployeeDashboard({ role, recentOS }: EmployeeDashboardProps) {
    const isAttendant = role === 'attendant' || role === 'cashier'

    // Real stats from actual OS data
    const openOS      = recentOS.filter(os => os.status === 'aberta').length
    const inProgress  = recentOS.filter(os => os.status === 'em_andamento').length
    const done        = recentOS.filter(os => os.status === 'concluida' || os.status === 'faturada').length
    const waiting     = recentOS.filter(os => os.status === 'aguardando_pecas').length

    const roleLabel = ROLE_LABEL[role] ?? role

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 lg:pb-8">
            <Header title="Nexus Dashboard" />

            <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Welcome */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-primary opacity-70">
                            {roleLabel}
                        </span>
                        <h1 className="text-3xl font-black tracking-tight mt-1">
                            Olá, <span className="text-primary italic">Nexus Team</span> 👋
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1 opacity-60">
                            Aqui está o que está acontecendo hoje.
                        </p>
                    </div>

                    <Link
 href="/service-orders/new"
 className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-xl shadow-primary/20 hover:scale-105 transition shrink-0"
 >
                        <ClipboardList className="w-4 h-4" />
                        Nova OS
                    </Link>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Abertas',     value: openOS,     color: 'blue',   bg: 'bg-blue-500/10 border-blue-500/20',    icon: Circle },
                        { label: 'Em andamento', value: inProgress, color: 'yellow', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Wrench },
                        { label: 'Aguardando', value: waiting,    color: 'orange', bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertCircle },
                        { label: 'Concluídas',  value: done,       color: 'green',  bg: 'bg-green-500/10 border-green-500/20',   icon: CheckCircle2 },
                    ].map(({ label, value, color, bg, icon: Icon }) => (
                        <div key={label} className={cn(
                            'rounded-2xl border p-4 flex flex-col gap-3 transition hover:scale-[1.02]',
                            bg
                        )}>
                            <Icon className={cn('w-5 h-5', `text-${color}-400`)} />
                            <div>
                                <p className={cn('text-3xl font-black', `text-${color}-400`)}>{value}</p>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* OS List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black ">
                                Ordens de Serviço
                            </h2>
                            <Link
 href="/service-orders"
 className="text-[13px] font-black text-primary hover:opacity-70 transition-opacity flex items-center gap-1"
 >
                                Ver tudo <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className="rounded-3xl border border-border bg-card overflow-hidden">
                            {recentOS.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {recentOS.slice(0, 8).map((os) => {
                                        const cfg = (STATUS_CONFIG as Record<string, any>)[os.status]
                                        const Icon: any = cfg?.icon ?? Circle
                                        return (
                                            <Link
                                                key={os.id}
                                                href={`/service-orders/${os.id}`}
                                                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition group"
                                            >
                                                {/* ID badge */}
                                                <div className="w-12 h-12 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition">
                                                    <span className="text-[11px] font-black uppercase opacity-40">OS</span>
                                                    <span className="text-sm font-black leading-none">{os.id.slice(0, 4)}</span>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                                        {os.title}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                        {os.customers?.name || 'Cliente Direto'} · {os.equipment_description}
                                                    </p>
                                                </div>

                                                {/* Status badge */}
                                                <div className={cn(
                                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-widest shrink-0',
                                                    cfg?.bg ?? 'bg-muted border-border',
                                                    cfg?.color ?? 'text-muted-foreground'
                                                )}>
                                                    <Icon className="w-3 h-3" />
                                                    {cfg?.label ?? os.status}
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
                                    <ClipboardList className="w-12 h-12 text-muted-foreground opacity-20" />
                                    <div>
                                        <p className="font-black text-sm uppercase tracking-widest">Nenhuma OS</p>
                                        <p className="text-xs text-muted-foreground mt-1 opacity-60">Crie a primeira ordem de serviço</p>
                                    </div>
                                    <Link
 href="/service-orders/new"
 className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:scale-105 transition"
 >
                                        Nova OS
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-black ">Ações Rápidas</h2>

                        <div className="space-y-3">
                            <Link
                                href="/service-orders/new"
                                className="group flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition hover:scale-[1.02]"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:-rotate-6 transition-transform">
                                    <ClipboardList className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-black uppercase text-sm">Nova OS</p>
                                    <p className="text-[11px] text-blue-500/60 font-bold uppercase tracking-widest mt-0.5">Protocolo OS</p>
                                </div>
                            </Link>

                            {!isAttendant ? null : (
                                <Link
                                    href="/pdv"
                                    className="group flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition hover:scale-[1.02]"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:rotate-6 transition-transform">
                                        <Zap className="w-8 h-8 fill-current" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black uppercase text-sm">PDV Caixa</p>
                                        <p className="text-[11px] text-emerald-500/60 font-bold uppercase tracking-widest mt-0.5">Venda Expressa</p>
                                    </div>
                                </Link>
                            )}

                            <Link
                                href="/service-orders"
                                className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:bg-muted transition group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                    <Clock className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">Ver todas as OS</p>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Histórico completo</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
