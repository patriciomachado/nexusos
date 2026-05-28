import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency, getStartOfDay, getLocalDateString, getStartOfMonth, getStartOfDaysAgo } from '@/lib/utils'
import {
    ClipboardList,
    DollarSign,
    Users,
    TrendingUp,
    CheckCircle,
    ArrowUpRight,
    ArrowDownRight,
    Settings
} from 'lucide-react'
import Link from 'next/link'
import RevenueChart from '@/components/dashboard/RevenueChart'
import { cn } from '@/lib/utils'
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard'

interface ServiceOrder {
    id: string
    created_at: string
    title: string
    status: string
    equipment_description: string
    estimated_cost: number | null
    final_cost: number | null
    customers?: { name: string } | null
    technicians?: { name: string } | null
}

interface InventoryItem {
    id: string
    name: string
    quantity_in_stock: number
    minimum_quantity: number
}

async function getEmployeeData(companyId: string) {
    const db = createAdminClient()
    const { data: recentOS } = await db
        .from('service_orders')
        .select('*, customers(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10)
    return { recentOS }
}

async function getDashboardData(companyId: string) {
    const db = createAdminClient()
    const now = new Date()

    // Date ranges
    const startOfToday = getStartOfDay(now)
    const startOfMonth = getStartOfMonth(now).toISOString()
    const startOfPrevMonthDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 1, 1)
    const startOfPrevMonth = getStartOfMonth(startOfPrevMonthDate).toISOString()
    const endOfPrevMonth = new Date(getStartOfMonth(now).getTime() - 1).toISOString()

    // Get company users for expense filtering
    const { data: companyUsers } = await db.from('users').select('id').eq('company_id', companyId)
    const userIds = companyUsers?.map(u => u.id) || []

    // Date range for 30 days
    const thirtyDaysAgo = getStartOfDaysAgo(30, now).toISOString()

    const [
        { count: totalOS },
        { data: openOSData },
        { count: todayOS },
        { data: recentOS },
        { data: currentPayments },
        { data: prevPayments },
        { data: chartPayments },
        { data: todayPayments },
        { count: totalCustomers },
        { count: prevCustomersCount },
        { count: activeTechnicians },
        { data: inventoryAlerts },
        // Profit queries
        { data: salesMonth },
        { data: osMonthData },
        // Consolidated exits for chart and month
        { data: allExits }
    ] = await Promise.all([
        db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        db.from('service_orders').select('estimated_cost, final_cost, status').eq('company_id', companyId).in('status', ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas']),
        db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', startOfToday.toISOString()),
        db.from('service_orders').select('*, customers(name), technicians(name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(6),
        db.from('payments').select('amount, payment_date').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', startOfMonth),
        db.from('payments').select('amount, payment_date').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', startOfPrevMonth).lte('payment_date', endOfPrevMonth),
        db.from('payments').select('amount, payment_date').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', thirtyDaysAgo),
        db.from('payments').select('amount, payment_date').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', startOfToday.toISOString()),
        db.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
        db.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).lt('created_at', startOfMonth),
        db.from('technicians').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
        db.from('inventory_items').select('id, name, quantity_in_stock, minimum_quantity').eq('company_id', companyId).limit(100),
        // Profit queries
        db.from('sales').select('final_amount, total_cost, created_at').eq('company_id', companyId).eq('status', 'completed').gte('created_at', startOfMonth),
        db.from('service_orders').select('final_cost, estimated_cost, parts_cost, completed_at').eq('company_id', companyId).in('status', ['concluida', 'faturada']).gte('completed_at', startOfMonth),
        // Daily exits for chart (covers current month too)
        userIds.length > 0
            ? db.from('cash_transactions').select('amount, created_at').eq('type', 'exit').in('user_id', userIds).gte('created_at', thirtyDaysAgo)
            : Promise.resolve({ data: [] })
    ])

    const monthRevenue = currentPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const prevMonthRevenue = prevPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Today's earnings
    const todayRevenue = todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Filter exits, parts cost and products cost for today
    const startOfTodayISO = startOfToday.toISOString()
    const todayExits = allExits?.filter(e => e.created_at >= startOfTodayISO) || []
    const todayExpenses = todayExits.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

    const todayOSCompleted = osMonthData?.filter(os => os.completed_at && os.completed_at >= startOfTodayISO) || []
    const todayPartsCost = todayOSCompleted.reduce((sum, os) => sum + (os.parts_cost || 0), 0) || 0

    const todaySales = salesMonth?.filter(sale => sale.created_at && sale.created_at >= startOfTodayISO) || []
    const todayProductsCost = todaySales.reduce((sum, sale) => sum + (sale.total_cost || 0), 0) || 0

    // Today's Net Profit: Today's Revenue - Today's Expenses - Today's Parts Cost - Today's Products Cost
    const todayNetProfit = todayRevenue - todayExpenses - todayPartsCost - todayProductsCost

    // Filter exits for current month
    const monthExits = allExits?.filter(e => e.created_at >= startOfMonth) || []
    const totalExpenses = monthExits.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

    // Profit Calculation
    // Parts cost of completed OS this month
    const totalPartsCost = osMonthData?.reduce((sum, os) => sum + (os.parts_cost || 0), 0) || 0
    const salesGrossProfit = salesMonth?.reduce((sum, sale) => sum + (sale.final_amount - (sale.total_cost || 0)), 0) || 0
    
    // Gross Profit = Revenue (payments) - Parts Cost of completed OS - Product Cost of sales
    const monthGrossProfit = monthRevenue - totalPartsCost + salesGrossProfit
    
    // Net Profit: Gross Profit - Operational Expenses
    const monthNetProfit = monthGrossProfit - totalExpenses

    // Average Ticket (Current Month)
    const concludedOS = recentOS?.filter(os => os.status === 'concluida' || os.status === 'faturada') || []
    const avgTicket = concludedOS.length > 0 ? (concludedOS.reduce((sum, os) => sum + (os.final_cost || os.estimated_cost || 0), 0) / concludedOS.length) : 0

    // Trends
    const calculateTrend = (curr: number, prev: number) => {
        if (!prev || prev === 0) return { change: curr > 0 ? '+100%' : '0%', trend: 'up' as const }
        const diff = ((curr - prev) / prev) * 100
        return {
            change: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
            trend: (diff >= 0 ? 'up' : 'down') as 'up' | 'down'
        }
    }

    const revenueTrend = calculateTrend(monthRevenue, prevMonthRevenue)
    const custTrend = calculateTrend(totalCustomers || 0, prevCustomersCount || 0)

    // Chart Data (Last 30 Days)
    const chartData = Array.from({ length: 30 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        const dateStr = getLocalDateString(d) // Localized YYYY-MM-DD
        
        const dayRevenue = chartPayments?.filter(p => {
            const pDate = new Date(p.payment_date)
            return getLocalDateString(pDate) === dateStr
        }).reduce((sum, p) => sum + (p.amount || 0), 0) || 0

        const dayExits = (allExits as { amount: number; created_at: string }[])?.filter(e => {
            const eDate = new Date(e.created_at)
            return getLocalDateString(eDate) === dateStr
        }).reduce((sum, e) => sum + (e.amount || 0), 0) || 0

        return {
            name: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
            revenue: dayRevenue,
            profit: dayRevenue - dayExits 
        }
    })

    return {
        stats: {
            totalOS,
            openOS: openOSData?.length || 0,
            todayOS,
            todayRevenue,
            todayNetProfit,
            monthRevenue,
            monthGrossProfit,
            monthNetProfit,
            avgTicket,
            totalCustomers,
            activeTechnicians,
            revenueTrend,
            custTrend
        },
        recentOS: recentOS as ServiceOrder[] | null,
        chartData,
        inventoryAlerts: (inventoryAlerts || [])
            .filter(item => Number(item.quantity_in_stock) <= Number(item.minimum_quantity))
            .slice(0, 4) as InventoryItem[]
    }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    aberta: { label: 'Aberta', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    agendada: { label: 'Agendada', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    em_andamento: { label: 'Execução', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    aguardando_pecas: { label: 'Peças', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    concluida: { label: 'Concluída', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    faturada: { label: 'Faturada', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    cancelada: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
}

export default async function DashboardPage() {
    const { userId } = await auth()
    if (!userId) return null

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, role, company_id, full_name').eq('clerk_id', userId).single()
    const companyId = user?.company_id

    if (!companyId) return null

    // Verificar role ANTES de carregar dados pesados
    if (user.role !== 'admin' && user.role !== 'owner') {
        const { recentOS } = await getEmployeeData(companyId)
        return <EmployeeDashboard role={user.role} recentOS={recentOS || []} />
    }

    const data = await getDashboardData(companyId)

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

    const grossMargin = data.stats.monthRevenue > 0 ? (data.stats.monthGrossProfit / data.stats.monthRevenue * 100).toFixed(1) : '0'
    const netMargin = data.stats.monthRevenue > 0 ? (data.stats.monthNetProfit / data.stats.monthRevenue * 100).toFixed(1) : '0'

    const kpis = [
        { 
            label: 'Ganhos do Dia', 
            value: formatCurrency(data.stats.todayRevenue), 
            subValue: `Líquido: ${formatCurrency(data.stats.todayNetProfit)}`, 
            icon: DollarSign, 
            color: 'emerald', 
            change: data.stats.revenueTrend.change, 
            trend: data.stats.revenueTrend.trend 
        },
        { label: 'Lucro Bruto', value: formatCurrency(data.stats.monthGrossProfit), icon: TrendingUp, color: 'indigo', change: `${grossMargin}% margem`, trend: 'up' },
        { label: 'Lucro Líquido', value: formatCurrency(data.stats.monthNetProfit), icon: CheckCircle, color: 'emerald', change: `${netMargin}% líquido`, trend: 'up' },
        { label: 'Ordens Ativas', value: data.stats.openOS.toString(), icon: ClipboardList, color: 'purple', change: `+${data.stats.todayOS} hoje`, trend: 'up' },
        { label: 'Novos Clientes', value: (data.stats.totalCustomers || 0).toString(), icon: Users, color: 'emerald', change: data.stats.custTrend.change, trend: data.stats.custTrend.trend },
    ]

    return (
        <div className="bg-background min-h-screen text-foreground pb-20 lg:pb-8 transition-colors duration-500 overflow-x-hidden" suppressHydrationWarning>
            <Header title="Nexus Dashboard" />

            <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700" suppressHydrationWarning>
                {/* Stitch Greeting Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6" suppressHydrationWarning>
                    <div className="text-center sm:text-left" suppressHydrationWarning>
                        <h2 className="text-3xl font-black tracking-tight text-foreground">
                            Bem-vindo de volta, <span className="text-primary">{user.full_name?.split(' ')[0] || 'Operador'}</span>
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium opacity-60">
                            Aqui está o resumo financeiro e operacional do seu negócio.
                        </p>
                    </div>
                    <div className="flex items-center gap-4" suppressHydrationWarning>
                        <Link href="/reports" className="px-5 py-2.5 rounded-2xl bg-card border border-border/40 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all">
                            Ver Relatórios
                        </Link>
                        <Link href="/service-orders/new" className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                            Nova OS
                        </Link>
                    </div>
                </div>

                {/* Metrics Section */}
                <div className="space-y-6">
                    {/* Mobile: Financial Hub & Quick Actions */}
                    <div className="flex flex-col gap-6 md:hidden">
                        {/* Financial Hub Card */}
                        <div className="glass-premium rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-br from-blue-600/20 via-background to-emerald-600/20 shadow-2xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -translate-y-12 translate-x-12" />
                            
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Fluxo de Caixa</h3>
                                    </div>
                                    <TrendingUp className="w-4 h-4 text-primary opacity-60" />
                                </div>
                                
                                {/* Main Metric: Revenue */}
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest opacity-80 mb-1">Ganhos do Dia (Bruto)</p>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter leading-none">
                                            {formatCurrency(data.stats.todayRevenue)}
                                        </p>
                                        <p className="text-xs font-semibold text-emerald-400/85">
                                            Líquido: <span className="font-black text-foreground">{formatCurrency(data.stats.todayNetProfit)}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Secondary Financial Metrics - Líquido grande e Bruto abaixo */}
                                <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-3 border-t border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest opacity-80">Líquido</p>
                                        <p className="text-xl font-black text-foreground tracking-tight">{formatCurrency(data.stats.monthNetProfit)}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">{netMargin}% margem</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest opacity-80">Bruto</p>
                                        <p className="text-xl font-black text-foreground tracking-tight">{formatCurrency(data.stats.monthGrossProfit)}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">{grossMargin}% margem</p>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Operational Stats - Ultra Compact Row */}
                        <div className="flex gap-3 sm:gap-4">
                            <div className="flex-1 glass-premium rounded-3xl p-3 sm:p-4 border border-white/5 flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                        <ClipboardList className="w-4 h-4" />
                                    </div>
                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">OS Ativas</p>
                                </div>
                                <p className="text-lg font-black text-foreground tracking-tighter">{data.stats.openOS}</p>
                            </div>
                            <div className="flex-1 glass-premium rounded-3xl p-3 sm:p-4 border border-white/5 flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Clientes</p>
                                </div>
                                <p className="text-lg font-black text-foreground tracking-tighter">{data.stats.totalCustomers}</p>
                            </div>
                        </div>
                    </div>

                    {/* Desktop: Original Grid Layout */}
                    <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
                        {kpis.map((kpi) => (
                            <div key={kpi.label} className="glass-premium rounded-[2rem] p-6 lg:p-8 transition-all group relative overflow-hidden active:scale-[0.98] h-full" suppressHydrationWarning>
                                <div className="flex flex-col justify-between h-full relative z-10" suppressHydrationWarning>
                                    <div className="space-y-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110",
                                            kpi.color === 'blue' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                                kpi.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                    kpi.color === 'indigo' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                                                        "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                        )} suppressHydrationWarning>
                                            <kpi.icon className="w-6 h-6" />
                                        </div>
                                        <div suppressHydrationWarning>
                                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-2">{kpi.label}</h3>
                                            <p className="text-2xl lg:text-3xl font-black text-foreground tracking-tighter">{kpi.value}</p>
                                            {kpi.subValue && (
                                                <p className="text-xs font-semibold text-muted-foreground mt-1.5 opacity-80">
                                                    {kpi.subValue}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "mt-4 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 border backdrop-blur-md self-start",
                                        kpi.trend === 'up' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                    )} suppressHydrationWarning>
                                        {kpi.change}
                                        {kpi.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


                {/* Primary Visualization Area - Optimization */}
                <div className="space-y-6" suppressHydrationWarning>
                    {/* Main Row: Chart */}
                    <div className="space-y-6" suppressHydrationWarning>
                        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-lg transition-all h-[350px]" suppressHydrationWarning>
                            <RevenueChart 
                                data={data.chartData} 
                                height={280} 
                            />
                        </div>

                        {/* Recent Service Orders Table for Admin */}
                        <div className="glass-premium rounded-3xl sm:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl" suppressHydrationWarning>
                            <div className="p-5 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row items-start sm:justify-between gap-3 bg-white/[0.02]">
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-widest leading-none">Ordens de Serviço Recentes</h2>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 opacity-50">Últimas movimentações do sistema</p>
                                </div>
                                <Link href="/service-orders" className="px-6 py-3 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5 w-full sm:w-auto text-center">
                                    Ver Tudo
                                </Link>
                            </div>
                            {/* Desktop/Tablet Grid-based Table */}
                            <div className="hidden md:block">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 border-b border-white/5 bg-white/[0.01] p-4 sm:p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 items-center">
                                    <div className="col-span-2">ID</div>
                                    <div className="col-span-5">Título</div>
                                    <div className="col-span-3">Cliente</div>
                                    <div className="col-span-2 text-right">Status</div>
                                </div>
                                {/* Table Body */}
                                <div className="divide-y divide-white/5">
                                    {data.recentOS && data.recentOS.length > 0 ? data.recentOS.map((os) => (
                                        <div
                                            key={os.id}
                                            className="relative block w-full hover:bg-white/[0.02] transition-colors group cursor-pointer select-none"
                                        >
                                            <div className="grid grid-cols-12 gap-4 p-4 sm:p-6 items-center">
                                                <div className="col-span-2 font-mono text-[10px] opacity-30">
                                                    #{os.id.slice(0, 8)}
                                                </div>
                                                <div className="col-span-5">
                                                    <Link 
                                                        href={`/service-orders/${os.id}`} 
                                                        className="font-bold text-foreground group-hover:text-primary transition-colors block before:absolute before:inset-0 before:z-0 truncate"
                                                    >
                                                        {os.title}
                                                    </Link>
                                                </div>
                                                <div className="col-span-3 text-sm font-medium text-foreground/70 truncate">
                                                    {os.customers?.name || 'Cliente Direto'}
                                                </div>
                                                <div className="col-span-2 text-right relative z-10">
                                                    <span className={cn(
                                                        "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest border",
                                                        STATUS_CONFIG[os.status]?.bg || "bg-muted border-white/5 text-muted-foreground"
                                                    )}>
                                                        {STATUS_CONFIG[os.status]?.label || os.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-12 text-center text-muted-foreground/40 text-xs italic">
                                            Nenhuma ordem de serviço recente.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Mobile Cards View */}
                            <div className="md:hidden p-4 space-y-3">
                                {data.recentOS && data.recentOS.length > 0 ? data.recentOS.map((os) => (
                                    <Link 
                                        key={os.id}
                                        href={`/service-orders/${os.id}`}
                                        className="block p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono text-[10px] opacity-30">#{os.id.slice(0, 8)}</span>
                                            <span className={cn(
                                                "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                                                STATUS_CONFIG[os.status]?.bg || "bg-muted border-white/5 text-muted-foreground"
                                            )}>
                                                {STATUS_CONFIG[os.status]?.label || os.status}
                                            </span>
                                        </div>
                                        <p className="font-bold text-foreground truncate">{os.title}</p>
                                        <p className="text-xs text-muted-foreground/70 mt-1">{os.customers?.name || 'Cliente Direto'}</p>
                                    </Link>
                                )) : (
                                    <p className="p-8 text-center text-muted-foreground/40 text-xs italic">Nenhuma ordem de serviço recente.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
