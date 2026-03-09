import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Star, Wrench, Shield, Award,
    ClipboardList, Phone, ChevronRight, Activity,
    TrendingUp, Calendar, Clock
} from 'lucide-react'
import { formatDateTime, OS_STATUS_LABELS, OS_STATUS_COLORS } from '@/lib/utils'

export default async function TechnicianDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    const { id } = await params
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    const [
        { data: technician },
        { data: serviceOrders }
    ] = await Promise.all([
        db.from('technicians').select('*').eq('id', id).eq('company_id', user?.company_id).single(),
        db.from('service_orders').select('*').eq('technician_id', id).eq('company_id', user?.company_id).order('created_at', { ascending: false })
    ])

    if (!technician) notFound()

    const completedOS = serviceOrders?.filter(os => os.status === 'concluida').length || 0
    const inProgressOS = serviceOrders?.filter(os => os.status === 'em_andamento').length || 0

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Perfil do Especialista" />

            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Back Link */}
                <Link href="/technicians" className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground transition-colors group">
                    <div className="p-1.5 rounded-lg bg-muted/5 border border-border group-hover:bg-orange-500/20 group-hover:border-orange-500/30 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    Voltar para Equipe Técnica
                </Link>

                {/* Technician Profile Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 p-8 rounded-[3rem] bg-card/60 backdrop-blur-3xl border border-border shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 blur-[120px] rounded-full" />

                        <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-muted/20 border border-border flex items-center justify-center text-5xl font-black text-orange-400 shadow-2xl relative">
                                <Award className="absolute -top-2 -right-2 w-8 h-8 text-yellow-500 drop-shadow-lg" />
                                {technician.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <h1 className="text-4xl font-black text-foreground tracking-tight">{technician.name}</h1>
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">Ativo</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center text-yellow-500">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Star key={i} className={`w-4 h-4 ${i <= Math.round(technician.performance_rating || 0) ? 'fill-current' : 'opacity-20'}`} />
                                            ))}
                                        </div>
                                        <span className="text-foreground/40 text-sm font-bold ml-2">{(technician.performance_rating || 0).toFixed(1)} Performance</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {technician.specialties?.map((s: string) => (
                                        <span key={s} className="px-4 py-2 rounded-xl bg-muted/5 border border-border text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                                            {s}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-6 pt-4 border-t border-border/10">
                                    <div className="flex items-center gap-3 text-muted-foreground/60">
                                        <Phone className="w-5 h-5 text-orange-400" />
                                        <span className="text-sm font-mono">{technician.phone || 'Sem contato'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-muted-foreground/60">
                                        <Calendar className="w-5 h-5 text-orange-400" />
                                        <span className="text-sm">Membro desde {new Date(technician.created_at).getFullYear()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="space-y-4">
                        <div className="p-6 rounded-3xl bg-muted/[0.02] border border-border backdrop-blur-xl group hover:border-indigo-500/20 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em]">Visão Geral</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-3xl font-black text-foreground tracking-tighter">{completedOS + inProgressOS}</p>
                                <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">Total de Atendimentos</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-3xl bg-muted/[0.02] border border-border backdrop-blur-xl">
                                <p className="text-2xl font-black text-emerald-400 tracking-tighter">{completedOS}</p>
                                <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">Concluídas</p>
                            </div>
                            <div className="p-5 rounded-3xl bg-muted/[0.02] border border-border backdrop-blur-xl">
                                <p className="text-2xl font-black text-orange-400 tracking-tighter">{inProgressOS}</p>
                                <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">Em Aberto</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task History */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-4">
                            <Activity className="w-8 h-8 text-orange-500" />
                            Histórico de Operações
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {serviceOrders && serviceOrders.length > 0 ? serviceOrders.map((os) => {
                            const statusClasses = OS_STATUS_COLORS[os.status] || 'border-border text-foreground/40'
                            return (
                                <Link
                                    key={os.id}
                                    href={`/service-orders/${os.id}`}
                                    className="p-6 rounded-[2.5rem] bg-card/40 border border-border hover:border-orange-500/30 transition-all group relative overflow-hidden"
                                >
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusClasses}`}>
                                                    {OS_STATUS_LABELS[os.status]}
                                                </span>
                                                <span className="text-[10px] font-mono text-foreground/20 uppercase tracking-widest">#{os.order_number}</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground group-hover:text-orange-400 transition-colors truncate max-w-[250px]">
                                                {os.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground/30 font-bold uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDateTime(os.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-muted/5 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </Link>
                            )
                        }) : (
                            <div className="md:col-span-2 p-20 text-center border-2 border-dashed border-border/5 rounded-[3rem]">
                                <Wrench className="w-12 h-12 text-foreground/5 mx-auto mb-4" />
                                <p className="text-muted-foreground/30 font-bold uppercase tracking-widest">Nenhuma atividade registrada</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
