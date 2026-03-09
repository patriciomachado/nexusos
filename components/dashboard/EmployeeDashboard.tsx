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
        <div className="bg-background min-h-screen text-foreground pb-12 transition-colors duration-500">
            <Header title="Nexus Dashboard" />

            <div className="p-4 sm:p-8 lg:p-12 max-w-[1600px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                {/* Dashboard Header: Welcome */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="h-px w-8 bg-primary opacity-50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Operação em Tempo Real</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                            Olá, <span className="text-primary italic">Nexus Team</span>
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium opacity-60">Aqui está o que está acontecendo na sua loja hoje.</p>
                    </div>

                    <div className="flex gap-4">
                        <button className="flex items-center gap-3 bg-card border border-border/50 px-6 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-muted transition-all">
                            Filtrar Dados
                        </button>
                        <button className="flex items-center gap-3 bg-primary text-primary-foreground px-6 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20">
                            Exportar PDF
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
                        description="4 urgentes aguardando"
                    />
                    <StatsCard
                        title="Estoque Baixo"
                        value="12"
                        icon={Package}
                        color="orange"
                        description="Itens abaixo do estoque mín."
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
                    <div className="xl:col-span-2 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black uppercase tracking-widest underline decoration-primary decoration-4 underline-offset-8">Ordens de Serviço</h2>
                            <Link href="/service-orders" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:opacity-70 transition-opacity">Ver Tudo →</Link>
                        </div>

                        <div className="bg-card/30 backdrop-blur-3xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <div className="divide-y divide-border/30">
                                {recentOS && recentOS.length > 0 ? recentOS.map((os: ServiceOrder) => (
                                    <Link href={`/service-orders/${os.id}`} key={os.id} className="p-8 flex items-center gap-8 group hover:bg-muted/50 transition-all block relative">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-muted border border-border flex flex-col items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/20 group-hover:text-primary transition-all shadow-inner overflow-hidden relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <span className="text-[9px] font-black uppercase tracking-tighter opacity-30 relative z-10">OS</span>
                                            <span className="text-lg font-black leading-none mt-0.5 relative z-10">{os.id.slice(0, 4)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-lg font-black text-foreground group-hover:text-primary transition-colors truncate mb-1">{os.title}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> {os.customers?.name || 'Cliente Direto'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-3 shrink-0">
                                            <div className={cn(
                                                "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-xl",
                                                STATUS_CONFIG[os.status]?.bg || 'bg-muted border-border text-foreground/40'
                                            )}>
                                                {STATUS_CONFIG[os.status]?.label}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase opacity-40">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(os.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="p-24 text-center text-muted-foreground flex flex-col items-center justify-center space-y-6">
                                        <div className="p-10 rounded-full bg-muted shadow-inner opacity-20">
                                            <ClipboardList className="w-20 h-20" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-foreground">Sem Movimentação</h3>
                                            <p className="text-sm font-medium opacity-60 italic">Nenhuma ordem de serviço registrada recentemente.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Quick Access Cards (Stitch Style) */}
                    <div className="space-y-8">
                        <h2 className="text-xl font-black uppercase tracking-widest">Painel Operacional</h2>

                        <div className="grid grid-cols-1 gap-6">
                            <Link href="/pdv" className="group bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 backdrop-blur-3xl border border-emerald-500/20 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-8 transition-all hover:scale-[1.02] hover:shadow-[0_0_80px_rgba(16,185,129,0.15)] relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-[60px] rounded-full group-hover:bg-emerald-500/20 transition-colors" />
                                <div className="w-24 h-24 rounded-[2rem] bg-emerald-500 text-emerald-50 shadow-2xl shadow-emerald-500/30 flex items-center justify-center group-hover:rotate-12 transition-transform border-4 border-white/10">
                                    <Zap className="w-12 h-12 fill-current" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black tracking-tight leading-none uppercase">PDV Caixa</h3>
                                    <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-[0.3em] leading-tight">Iniciar Venda Expressa</p>
                                </div>
                            </Link>

                            <Link href="/service-orders/new" className="group bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur-3xl border border-blue-500/20 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-8 transition-all hover:scale-[1.02] hover:shadow-[0_0_80px_rgba(59,130,246,0.15)] relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full group-hover:bg-blue-500/20 transition-colors" />
                                <div className="w-24 h-24 rounded-[2rem] bg-blue-500 text-blue-50 shadow-2xl shadow-blue-500/30 flex items-center justify-center group-hover:-rotate-12 transition-transform border-4 border-white/10">
                                    <ClipboardList className="w-12 h-12" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black tracking-tight leading-none uppercase">Nova OS</h3>
                                    <p className="text-[10px] text-blue-500/60 font-black uppercase tracking-[0.3em] leading-tight">Abertura de Protocolo</p>
                                </div>
                            </Link>

                            <div className="bg-card/30 backdrop-blur-3xl border border-border/50 rounded-[2.5rem] p-8 flex items-center gap-6 group hover:border-primary/30 transition-all opacity-60">
                                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                    <AlertCircle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-widest text-foreground">Suporte Nexus</h4>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Ajuda e Documentação</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

