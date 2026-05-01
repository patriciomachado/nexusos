import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency, getStartOfDay, getStartOfMonth } from '@/lib/utils'
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
    const startOfToday = getStartOfDay(now)
    const monthStart = getStartOfMonth(now).toISOString()

    // Get company users for expense filtering
    const { data: companyUsers } = await db.from('users').select('id').eq('company_id', companyId)
    const userIds = companyUsers?.map(u => u.id) || []

    const [
        { data: osByStatus },
        { data: monthPayments },
        { data: recentOS },
        { count: totalOS },
        { data: salesMonth },
        { data: osMonthProfitData },
        { data: expensesMonth }
    ] = await Promise.all([
        db.from('service_orders').select('status').eq('company_id', companyId),
        db.from('payments').select('amount, payment_method').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', monthStart),
        db.from('service_orders').select('status, created_at, final_cost').eq('company_id', companyId).gte('created_at', monthStart),
        db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        db.from('sales').select('final_amount, sale_items(quantity, product:inventory_items(cost_price))').eq('company_id', companyId).eq('status', 'completed').gte('created_at', monthStart),
        db.from('service_orders').select('final_cost, parts_cost').eq('company_id', companyId).in('status', ['concluida', 'faturada']).gte('completed_at', monthStart),
        db.from('cash_transactions').select('amount').eq('type', 'exit').in('user_id', userIds).gte('created_at', monthStart)
    ])

    const monthRevenue = monthPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0
    const osThisMonth = recentOS?.length || 0
    const osCompletedThisMonth = recentOS?.filter((o: any) => o.status === 'concluida' || o.status === 'faturada').length || 0

    // Profit Calculation
    const osGrossProfit = osMonthProfitData?.reduce((sum, os) => sum + ((os.final_cost || 0) - (os.parts_cost || 0)), 0) || 0
    const salesGrossProfit = salesMonth?.reduce((sum, sale) => {
        const cost = (sale.sale_items as any[])?.reduce((iSum, item) => iSum + (Number(item.quantity) * Number(item.product?.cost_price || 0)), 0) || 0
        return sum + (sale.final_amount - cost)
    }, 0) || 0
    
    const monthGrossProfit = osGrossProfit + salesGrossProfit
    const totalExpenses = expensesMonth?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
    const monthNetProfit = monthGrossProfit - totalExpenses

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

            <div className="p-6 max-w-7xl mx-auto space-y-12">
                {/* Section Header */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-1 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/60">Gestão de Performance</span>
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter">Análise e Relatórios</h2>
                    <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-xl">Acompanhe o desempenho financeiro, produtividade da equipe e indicadores de crescimento em tempo real.</p>
                </div>

                {/* Profitability Detailing Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="p-8 rounded-[2rem] bg-card/40 border border-border/50 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black text-foreground">Lucratividade Bruta</h3>
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Margem de Operação</span>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Receita Total Bruta</p>
                                    <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(monthRevenue)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Crescimento</p>
                                    <p className="text-sm font-bold text-emerald-500">+12.5%</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-muted-foreground/60 uppercase">Custo de Peças (OS)</span>
                                    <span className="font-black text-rose-500">-{formatCurrency(osMonthProfitData?.reduce((s, o) => s + (o.parts_cost || 0), 0) || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-muted-foreground/60 uppercase">Custo de Produtos (PDV)</span>
                                    <span className="font-black text-rose-500">-{formatCurrency(0)}</span>
                                </div>
                                <div className="h-[1px] bg-border/20 w-full" />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-foreground uppercase tracking-widest">Lucro Bruto Final</span>
                                    <span className="text-lg font-black text-indigo-500">{formatCurrency(monthGrossProfit)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-card/40 border border-border/50 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black text-foreground">Lucratividade Líquida</h3>
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Resultado Final</span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Lucro Bruto Disponível</p>
                                    <p className="text-3xl font-black text-indigo-500 tracking-tighter">{formatCurrency(monthGrossProfit)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Margem Real</p>
                                    <p className="text-sm font-bold text-primary">{monthRevenue > 0 ? ((monthNetProfit / monthRevenue) * 100).toFixed(1) : 0}%</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-muted-foreground/60 uppercase">Despesas Operacionais</span>
                                    <span className="font-black text-rose-500">-{formatCurrency(totalExpenses)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs opacity-50">
                                    <span className="font-bold text-muted-foreground/60 uppercase">Impostos (Est.)</span>
                                    <span className="font-black">R$ 0,00</span>
                                </div>
                                <div className="h-[1px] bg-border/20 w-full" />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-foreground uppercase tracking-widest">Lucro Líquido Real</span>
                                    <span className="text-lg font-black text-emerald-500">{formatCurrency(monthNetProfit)}</span>
                                </div>
                            </div>
                        </div>
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
                            {Object.entries(statusCounts).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([status, count]) => {
                                const total = Object.values(statusCounts).reduce((s: number, c: any) => s + (c as number), 0)
                                const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0
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
                                                className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
                                                style={{ width: `${pct}%` }}
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
                            {Object.entries(methodTotals).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([method, total]) => {
                                const totalAll = Object.values(methodTotals).reduce((s: number, v: any) => s + (v as number), 0)
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
                                                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${pct}%` }}
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
