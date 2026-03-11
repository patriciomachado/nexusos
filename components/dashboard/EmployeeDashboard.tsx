import { ClipboardList, Zap, Clock, TrendingUp, Users, Package, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import StatsCard from './StatsCard'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    aberta: { label: 'Aberta', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/10' },
    agendada: { label: 'Agendada', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20 shadow-purple-500/10' },
    em_andamento: { label: 'Execução', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20 shadow-yellow-500/10' },
    aguardando_pecas: { label: 'Peças', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20 shadow-orange-500/10' },
    concluida: { label: 'Concluída', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20 shadow-green-500/10' },
    faturada: { label: 'Faturada', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10' },
    cancelada: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20 shadow-red-500/10' },
}

interface ServiceOrder {
    id: string
    created_at: string
    title: string
    status: string
    equipment_description: string
    customers?: { name: string; company_name: string } | null
}

interface EmployeeDashboardProps {
    role: string;
    recentOS: ServiceOrder[];
}

export default function EmployeeDashboard({ role, recentOS }: EmployeeDashboardProps) {
    const isTechnician = role === 'technician' || role === 'attendant';

    return (
        <div className="bg-[#0f172a] min-h-screen text-foreground pb-20 lg:pb-8 transition-colors duration-500">
            <Header title="Nexus Dashboard" />

            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Dashboard Header: Welcome */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Terminal Ativo</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter leading-none">
                            Olá, <span className="text-primary italic">Nexus Team</span>
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium opacity-60">Aqui está o pulso operacional de hoje.</p>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-5 py-3 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all">
                            Relatórios
                        </button>
                        <button className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                            Nova OS
                        </button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Vendas Hoje"
                        value="R$ 1.248,50"
                        icon={TrendingUp}
                        trend={{ value: '12%', isUp: true }}
                        color="emerald"
                    />
                    <StatsCard
                        title="OS em Aberto"
                        value={recentOS.filter(os => os.status === 'aberta').length + 8} // Fake count for visual
                        icon={ClipboardList}
                        trend={{ value: '3', isUp: true }}
                        color="blue"
                    />
                    <StatsCard
                        title="Estoque Baixo"
                        value="12"
                        icon={Package}
                        color="orange"
                    />
                    <StatsCard
                        title="Novos Clientes"
                        value="4"
                        icon={Users}
                        trend={{ value: '2', isUp: true }}
                        color="purple"
                    />
                </div>

                {/* Secondary Layout: Quick Access & Recent Services */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">

                    {/* Column 1 & 2: Recent Services Table-like View */}
                    <div className="xl:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black uppercase tracking-widest underline decoration-primary decoration-4 underline-offset-8">Ordens de Serviço</h2>
                            <Link href="/service-orders" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:opacity-70 transition-opacity">Ver Tudo →</Link>
                        </div>

                        <div className="glass-premium rounded-[2.5rem] overflow-hidden">
                            <div className="divide-y divide-white/5">
                                {recentOS && recentOS.length > 0 ? recentOS.map((os: ServiceOrder) => (
                                    <Link href={`/service-orders/${os.id}`} key={os.id} className="p-6 flex items-center gap-6 group hover:bg-white/[0.03] transition-all block relative">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/20 group-hover:text-primary transition-all shadow-inner overflow-hidden relative">
                                            <span className="text-[8px] font-black uppercase tracking-tighter opacity-30">OS</span>
                                            <span className="text-base font-black leading-none mt-0.5">{os.id.slice(0, 4)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-lg font-black text-foreground group-hover:text-primary transition-colors truncate mb-1">{os.title}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> {os.customers?.name || 'Cliente Direto'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <div className={cn(
                                                "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                                                STATUS_CONFIG[os.status]?.bg || 'bg-muted border-border text-foreground/40'
                                            )}>
                                                {STATUS_CONFIG[os.status]?.label}
                                            </div>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="p-20 text-center text-muted-foreground flex flex-col items-center justify-center space-y-4">
                                        <ClipboardList className="w-16 h-16 opacity-10" />
                                        <h3 className="text-base font-black uppercase tracking-tighter text-foreground">Sem Movimentação</h3>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Quick Access Cards (Stitch Style) */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black uppercase tracking-widest">Ações Rápidas</h2>

                        <div className="grid grid-cols-1 gap-4">
                            <Link href="/pdv" className="group glass-premium border-emerald-500/20 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.02] relative overflow-hidden">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-emerald-500 text-emerald-50 shadow-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                    <Zap className="w-10 h-10 fill-current" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black uppercase">PDV Caixa</h3>
                                    <p className="text-[9px] text-emerald-500/60 font-black uppercase tracking-[0.2em]">Venda Expressa</p>
                                </div>
                            </Link>

                            <Link href="/service-orders/new" className="group glass-premium border-blue-500/20 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.02] relative overflow-hidden">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-blue-500 text-blue-50 shadow-2xl flex items-center justify-center group-hover:-rotate-12 transition-transform">
                                    <ClipboardList className="w-10 h-10" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black uppercase">Nova OS</h3>
                                    <p className="text-[9px] text-blue-500/60 font-black uppercase tracking-[0.2em]">Protocolo OS</p>
                                </div>
                            </Link>

                            <div className="glass-premium rounded-[2rem] p-6 flex items-center gap-4 opacity-60">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black text-xs uppercase tracking-widest text-foreground">Suporte</h4>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Nexus OS</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

