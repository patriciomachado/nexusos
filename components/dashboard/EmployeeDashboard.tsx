import { ClipboardList, Zap, Clock } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    aberta: { label: 'Aberta', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    agendada: { label: 'Agendada', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    em_andamento: { label: 'Execução', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    aguardando_pecas: { label: 'Peças', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    concluida: { label: 'Concluída', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    faturada: { label: 'Faturada', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    cancelada: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
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
            <Header title="Área do Funcionário" />

            <div className="p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 lg:space-y-10 animate-in fade-in duration-700">
                {/* Welcome & Quick Actions */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight mb-2">Acesso Rápido</h2>
                        <p className="text-muted-foreground text-sm font-medium">Selecione o módulo de trabalho para continuar.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                        {role !== 'technician' && (
                            <Link href="/pdv" className="group bg-card border border-border hover:border-emerald-500/30 rounded-2xl lg:rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center gap-4 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
                                    <Zap className="w-6 h-6 lg:w-8 lg:h-8" />
                                </div>
                                <div className="text-center relative z-10">
                                    <h3 className="text-lg lg:text-xl font-black mb-1">PDV Caixa</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-tight">Abrir Ponto de Venda</p>
                                </div>
                            </Link>
                        )}

                        {role !== 'cashier' && (
                            <Link href="/service-orders/new" className="group bg-card border border-border hover:border-blue-500/30 rounded-2xl lg:rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center gap-4 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
                                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
                                    <ClipboardList className="w-6 h-6 lg:w-8 lg:h-8" />
                                </div>
                                <div className="text-center relative z-10">
                                    <h3 className="text-lg lg:text-xl font-black mb-1">Nova OS</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-tight">Criar Ordem de Serviço</p>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Technician specific content: Recent OS */}
                {isTechnician && (
                    <div className="bg-card border border-border rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl">
                        <div className="px-5 py-4 lg:px-8 lg:py-6 border-b border-border flex items-center justify-between bg-muted/30">
                            <div>
                                <h3 className="text-xs lg:text-sm font-black text-foreground uppercase tracking-widest">Serviços Recentes</h3>
                                <p className="text-[10px] lg:text-xs text-muted-foreground mt-1 leading-none">Últimas ordens da sua empresa</p>
                            </div>
                            <Link href="/service-orders" className="px-3 py-1.5 lg:px-4 lg:py-2 bg-primary/10 text-primary rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-black hover:bg-primary hover:text-primary-foreground transition-all uppercase tracking-widest">
                                Ver Lista
                            </Link>
                        </div>
                        <div className="divide-y divide-border/50">
                            {recentOS && recentOS.length > 0 ? recentOS.map((os: ServiceOrder) => (
                                <Link href={`/service-orders/${os.id}`} key={os.id} className="p-6 flex items-center gap-6 group hover:bg-muted/50 transition-all block">
                                    <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex flex-col items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/20 group-hover:text-primary transition-all shadow-inner">
                                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-50">#ID</span>
                                        <span className="text-sm font-black leading-none mt-0.5">{os.id.slice(0, 4)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate mb-1">{os.title}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{os.customers?.name || 'Cliente Sem Nome'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-3 shrink-0">
                                        <div className={cn(
                                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                            STATUS_CONFIG[os.status]?.bg || 'bg-muted border-border text-foreground/40'
                                        )}>
                                            {STATUS_CONFIG[os.status]?.label}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(os.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                </Link>
                            )) : (
                                <div className="px-8 py-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-4">
                                    <ClipboardList className="w-12 h-12 opacity-20" />
                                    <p className="text-sm font-black uppercase tracking-widest">Nenhuma ordem encontrada</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
