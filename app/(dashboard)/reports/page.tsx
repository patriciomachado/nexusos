import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency, getStartOfDay, getStartOfMonth } from '@/lib/utils'
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react'

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
    
    // Previous month dates
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthStart = getStartOfMonth(prevMonth).toISOString()
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

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
        { data: expensesMonth },
        { data: pdvSalesMonth },
        { data: prevMonthPayments },
        { data: prevMonthExpenses }
    ] = await Promise.all([
        db.from('service_orders').select('status').eq('company_id', companyId),
        db.from('payments').select('amount, payment_method').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', monthStart),
        db.from('service_orders').select('status, created_at, final_cost').eq('company_id', companyId).gte('created_at', monthStart),
        db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        db.from('sales').select('final_amount, sale_items(quantity, product:inventory_items(cost_price))').eq('company_id', companyId).eq('status', 'completed').gte('created_at', monthStart),
        db.from('service_orders').select('id, final_cost, parts_cost, service_order_items(total_cost)').eq('company_id', companyId).in('status', ['concluida', 'faturada']).gte('completed_at', monthStart),
        db.from('cash_transactions').select('amount').eq('type', 'exit').in('user_id', userIds).gte('created_at', monthStart),
        db.from('sales').select('id, final_amount, sale_items(quantity, unit_cost)').eq('company_id', companyId).eq('status', 'completed').gte('created_at', monthStart),
        db.from('payments').select('amount').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', prevMonthStart).lte('payment_date', prevMonthEnd),
        db.from('cash_transactions').select('amount').eq('type', 'exit').in('user_id', userIds).gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd)
    ])

    const monthRevenue = monthPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0
    const osThisMonth = recentOS?.length || 0
    const osCompletedThisMonth = recentOS?.filter((o: { status: string }) => o.status === 'concluida' || o.status === 'faturada').length || 0

    // Previous month calculations
    const prevMonthRevenue = prevMonthPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0
    const prevMonthExpensesTotal = prevMonthExpenses?.reduce((s, exp) => s + (exp.amount || 0), 0) || 0
    const prevMonthNetProfit = prevMonthRevenue - prevMonthExpensesTotal
    
    // Calculate growth percentage
    const revenueGrowth = prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0

    // Cost of parts for completed OS this month (calculate from items or use parts_cost)
    const totalPartsCost = osMonthProfitData?.reduce((sum, os) => {
        const items = os.service_order_items as unknown as { total_cost: number }[] | null
        const itemsCost = items?.reduce((iSum, item) => iSum + (Number(item.total_cost) || 0), 0) || 0
        return sum + (itemsCost || Number(os.parts_cost) || 0)
    }, 0) || 0

    // Cost of products for PDV sales this month
    const totalProductsCost = pdvSalesMonth?.reduce((sum, sale) => {
        const items = sale.sale_items as unknown as { quantity: number; unit_cost: number }[] | null
        const itemsCost = items?.reduce((iSum, item) => iSum + (Number(item.quantity) * Number(item.unit_cost || 0)), 0) || 0
        return sum + itemsCost
    }, 0) || 0

    // Gross Profit = Total Revenue
    const monthGrossProfit = monthRevenue
    const totalExpenses = expensesMonth?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
    
    // Net Profit: Gross Profit - Operational Expenses
    const monthNetProfit = monthGrossProfit - totalExpenses

    const statusCounts = (osByStatus || []).reduce((acc: Record<string, number>, os: { status: string }) => {
        acc[os.status] = (acc[os.status] || 0) + 1
        return acc
    }, {})

    const methodTotals = (monthPayments || []).reduce((acc: Record<string, number>, p: { payment_method: string; amount: number }) => {
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Este Mês</p>
                                    <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(monthRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Mês Anterior</p>
                                    <p className="text-xl font-bold text-muted-foreground/60 tracking-tighter">{formatCurrency(prevMonthRevenue)}</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                    {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                                </p>
                                <p className="text-xs text-muted-foreground/40">vs mês anterior</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-muted/20 border border-border/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-foreground uppercase tracking-widest">Lucro Bruto</span>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Este Mês</p>
                                    <p className="text-2xl font-black text-emerald-500 tracking-tighter">{formatCurrency(monthNetProfit)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Mês Anterior</p>
                                    <p className="text-xl font-bold text-muted-foreground/60 tracking-tighter">{formatCurrency(prevMonthNetProfit)}</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Margem Real</p>
                                <p className="text-sm font-bold text-primary">{monthRevenue > 0 ? ((monthNetProfit / monthRevenue) * 100).toFixed(1) : 0}%</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-muted-foreground/60 uppercase">Despesas Operacionais</span>
                                    <span className="font-black text-rose-500">-{formatCurrency(totalExpenses)}</span>
                                </div>
                                <div className="h-[1px] bg-border/20 w-full" />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-foreground uppercase tracking-widest">Lucro Líquido</span>
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
                                const total = Object.values(statusCounts).reduce((s: number, c: number) => s + c, 0)
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
