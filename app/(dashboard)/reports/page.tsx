import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, TrendingUp, Users, Package, ClipboardCheck, Timer, PieChart, Activity, ArrowUpRight, ArrowDownRight, Printer, Download, Filter, ClipboardList, Wallet, DollarSign, Calendar } from 'lucide-react'

export default async function ReportsPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('role').eq('clerk_id', userId).single()
    if (currentUser?.role === 'technician' || currentUser?.role === 'cashier' || currentUser?.role === 'attendant') {
        redirect('/dashboard')
    }

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const companyId = user?.company_id

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
        { data: osByStatus },
        { data: monthPayments },
        { data: recentOS },
        { count: totalOS },
    ] = await Promise.all([
        db.from('service_orders').select('status').eq('company_id', companyId),
        db.from('payments').select('amount, payment_method').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', monthStart),
        db.from('service_orders').select('status, created_at, final_cost').eq('company_id', companyId).gte('created_at', monthStart),
        db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    ])

    const monthRevenue = monthPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0
    const osThisMonth = recentOS?.length || 0
    const osCompletedThisMonth = recentOS?.filter((o: any) => o.status === 'concluida' || o.status === 'faturada').length || 0

    const statusCounts = (osByStatus || []).reduce((acc: Record<string, number>, os: any) => {
        acc[os.status] = (acc[os.status] || 0) + 1
        return acc
    }, {})

    const methodTotals = (monthPayments || []).reduce((acc: Record<string, number>, p: any) => {
        acc[p.payment_method] = (acc[p.payment_method] || 0) + Number(p.amount)
        return acc
    }, {})

    const statusLabels: Record<string, string> = {
        aberta: 'Aberta', agendada: 'Agendada', em_andamento: 'Em Andamento',
        aguardando_pecas: 'Peças', concluida: 'Concluída', faturada: 'Faturada', cancelada: 'Cancelada'
    }

    const statusColors: Record<string, string> = {
        aberta: 'bg-blue-500', agendada: 'bg-indigo-500', em_andamento: 'bg-amber-500',
        aguardando_pecas: 'bg-orange-500', concluida: 'bg-emerald-500', faturada: 'bg-cyan-500', cancelada: 'bg-rose-500'
    }

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Análise e Performance" />

            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Summary View */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-6 rounded-3xl bg-card/60 border border-border/50 backdrop-blur-xl group hover:border-primary/30 transition-all shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <ClipboardCheck className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Geral Histórico</span>
                        </div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{totalOS || 0}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase">Total de Ordens de Serviço</p>
                    </div>

                    <div className="p-6 rounded-3xl bg-card/60 border border-border/50 backdrop-blur-xl group hover:border-emerald-500/30 transition-all shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Mensal Receita</span>
                        </div>
                        <p className="text-3xl font-black text-emerald-500 dark:text-emerald-400 tracking-tighter">{formatCurrency(monthRevenue)}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase">Faturamento Concluído (Mês)</p>
                    </div>

                    <div className="p-6 rounded-3xl bg-card/60 border border-border/50 backdrop-blur-xl group hover:border-blue-500/30 transition-all shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Mensal Volume</span>
                        </div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{osThisMonth}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase">Novos Serviços Aberto</p>
                    </div>

                    <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 backdrop-blur-xl group transition-all shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-primary/20 text-primary/80">
                                <Timer className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-primary/50 uppercase tracking-widest">Eficiência</span>
                        </div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">
                            {osThisMonth > 0 ? Math.round((osCompletedThisMonth / osThisMonth) * 100) : 0}%
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase">Taxa de Conclusão (Mês)</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Status Distribution */}
                    <div className="p-8 rounded-[2rem] bg-card/40 border border-border/50 backdrop-blur-3xl shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                    <PieChart className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">Distribuição de Status</h3>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">Live Data</span>
                        </div>

                        <div className="space-y-6">
                            {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                                const total = Object.values(statusCounts).reduce((s: number, c: number) => s + c, 0)
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                                const color = statusColors[status] || 'bg-muted/20'

                                return (
                                    <div key={status} className="group">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-muted-foreground/60 group-hover:text-foreground transition-colors">
                                                {statusLabels[status] || status}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-foreground">{count as number}</span>
                                                <span className="text-[10px] text-muted-foreground/30 uppercase font-bold tracking-tighter">ordens</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden p-[1px]">
                                            <div
                                                className={`h - full ${color} rounded - full shadow - [0_0_10px_rgba(59, 130, 246, 0.3)] transition - all duration - 1000 ease - out`}
                                                style={{ width: `${pct}% ` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                            {Object.keys(statusCounts).length === 0 && (
                                <div className="py-20 text-center">
                                    <p className="text-sm text-muted-foreground/20 italic">Dados insuficientes para visualização</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Performance */}
                    <div className="p-8 rounded-[2rem] bg-card/40 border border-border/50 backdrop-blur-3xl shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">Meios de Pagamento</h3>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">Ciclo Atual</span>
                        </div>

                        <div className="space-y-6">
                            {Object.entries(methodTotals).sort((a, b) => b[1] - a[1]).map(([method, total]) => {
                                const totalAll = Object.values(methodTotals).reduce((s: number, v: number) => s + v, 0)
                                const pct = totalAll > 0 ? Math.round(((total as number) / totalAll) * 100) : 0
                                const labels: Record<string, string> = {
                                    dinheiro: 'Dinheiro (Espécie)',
                                    cartao_credito: 'Cartão de Crédito',
                                    cartao_debito: 'Cartão de Débito',
                                    pix: 'PIX Instantâneo',
                                    boleto: 'Bancário / Boleto',
                                    transferencia: 'Transferência / TED',
                                    crediario: 'Crediário Próprio'
                                }

                                return (
                                    <div key={method} className="group">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-muted-foreground/60 group-hover:text-foreground transition-colors">
                                                {labels[method] || method}
                                            </span>
                                            <span className="text-xs font-black text-foreground">{formatCurrency(total as number)}</span>
                                        </div>
                                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden p-[1px]">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out"
                                                style={{ width: `${pct}% ` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                            {Object.keys(methodTotals).length === 0 && (
                                <div className="py-20 text-center">
                                    <p className="text-sm text-muted-foreground/20 italic">Sem registros financeiros no período</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
