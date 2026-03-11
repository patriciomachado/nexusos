import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import {
    ClipboardList,
    DollarSign,
    Users,
    TrendingUp,
    AlertCircle,
    Clock,
    CheckCircle,
    ArrowUpRight,
    ArrowDownRight,
    Settings,
    LayoutDashboard
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
    customers?: { name: string; company_name: string } | null
    technicians?: { name: string } | null
}

interface InventoryItem {
    id: string
    name: string
    quantity_in_stock: number
    minimum_quantity: number
}

async function getDashboardData(companyId: string) {
    const db = createAdminClient()
    const now = new Date()

    // Date ranges
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

    const [
        { count: totalOS },
        { data: openOSData },
        { count: todayOS },
        { data: recentOS },
        { data: currentPayments },
        { data: prevPayments },
        { data: chartPayments },
        { count: totalCustomers },
        { count: prevCustomersCount },
        { count: activeTechnicians },
        { data: inventoryAlerts }
    ] = await Promise.all([
        db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        db.from('service_orders').select('estimated_cost, final_cost, status').eq('company_id', companyId).in('status', ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas']),
        db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()),
        db.from('service_orders').select('*, customers(name, company_name), technicians(name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(6),
        db.from('payments').select('amount, payment_date').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', startOfMonth),
        db.from('payments').select('amount, payment_date').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', startOfPrevMonth).lte('payment_date', endOfPrevMonth),
        db.from('payments').select('amount, payment_date').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        db.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
        db.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).lt('created_at', startOfMonth),
        db.from('technicians').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
        db.from('inventory_items').select('id, name, quantity_in_stock, minimum_quantity').eq('company_id', companyId).filter('quantity_in_stock', 'lte', 'minimum_quantity').limit(4)
    ])

    const monthRevenue = currentPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const prevMonthRevenue = prevPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

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

    // Chart Data (Last 7 Days)
    const chartData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        const dateStr = d.toISOString().split('T')[0]
        const dayRevenue = chartPayments?.filter(p => p.payment_date.startsWith(dateStr)).reduce((sum, p) => sum + (p.amount || 0), 0) || 0
        return {
            name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
            revenue: dayRevenue
        }
    })

    return {
        stats: {
            totalOS,
            openOS: openOSData?.length || 0,
            todayOS,
            monthRevenue,
            avgTicket,
            totalCustomers,
            activeTechnicians,
            revenueTrend,
            custTrend
        },
        recentOS: recentOS as ServiceOrder[] | null,
        chartData,
        inventoryAlerts: inventoryAlerts as InventoryItem[] | null
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
    const { data: user } = await db.from('users').select('*, companies(*)').eq('clerk_id', userId).single()
    const companyId = user?.company_id

    if (!companyId) return null

    const data = await getDashboardData(companyId)

    if (user.role !== 'admin' && user.role !== 'owner') {
        return <EmployeeDashboard role={user.role} recentOS={data.recentOS || []} />
    }

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

    const kpis = [
        { label: 'Receita do Mês', value: formatCurrency(data.stats.monthRevenue), icon: DollarSign, color: 'blue', change: data.stats.revenueTrend.change, trend: data.stats.revenueTrend.trend },
        { label: 'Ordens Ativas', value: data.stats.openOS.toString(), icon: ClipboardList, color: 'purple', change: `+${data.stats.todayOS} hoje`, trend: 'up' },
        { label: 'Novos Clientes', value: (data.stats.totalCustomers || 0).toString(), icon: Users, color: 'emerald', change: data.stats.custTrend.change, trend: data.stats.custTrend.trend },
    ]

    return (
        <div className="bg-background min-h-screen text-foreground pb-20 lg:pb-8 transition-colors duration-500 overflow-x-hidden" suppressHydrationWarning>
            <Header title="Nexus Dashboard" />

            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700" suppressHydrationWarning>
                {/* Stitch Greeting Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6" suppressHydrationWarning>
                    <div className="text-center sm:text-left" suppressHydrationWarning>
                        <h2 className="text-3xl font-black tracking-tight text-foreground">
                            Welcome back, <span className="text-primary">{user.full_name?.split(' ')[0] || 'Operator'}</span>
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium opacity-60">
                            Here's what's happening with your business today.
                        </p>
                    </div>
                    <div className="flex items-center gap-4" suppressHydrationWarning>
                        <Link href="/reports" className="px-5 py-2.5 rounded-2xl bg-card border border-border/40 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all">
                            View Reports
                        </Link>
                        <Link href="/service-orders/new" className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                            New OS
                        </Link>
                    </div>
                </div>

                {/* Horizontal Stitch Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6" suppressHydrationWarning>
                    {kpis.map((kpi) => (
                        <div key={kpi.label} className="glass-premium rounded-[2rem] p-8 transition-all group relative overflow-hidden active:scale-[0.98]" suppressHydrationWarning>
                            <div className="flex items-start justify-between relative z-10" suppressHydrationWarning>
                                <div className="space-y-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110",
                                        kpi.color === 'blue' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                            kpi.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                    )} suppressHydrationWarning>
                                        <kpi.icon className="w-6 h-6" />
                                    </div>
                                    <div suppressHydrationWarning>
                                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-2">{kpi.label}</h3>
                                        <p className="text-3xl font-black text-foreground tracking-tighter">{kpi.value}</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 border backdrop-blur-md",
                                    kpi.trend === 'up' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                )} suppressHydrationWarning>
                                    {kpi.change}
                                    {kpi.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Primary Visualization Area - Optimization */}
                <div className="grid lg:grid-cols-3 gap-6" suppressHydrationWarning>
                    {/* Main Row: Chart & Command Center */}
                    <div className="lg:col-span-2" suppressHydrationWarning>
                        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-lg transition-all h-full" suppressHydrationWarning>
                            <RevenueChart data={data.chartData} totalRevenue={formatCurrency(data.stats.monthRevenue)} height={220} />
                        </div>
                    </div>

                    <div className="lg:col-span-1" suppressHydrationWarning>
                        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-8 text-primary-foreground shadow-2xl relative overflow-hidden group border border-border/40 h-full" suppressHydrationWarning>
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-1000" suppressHydrationWarning />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 opacity-80 text-white">Comandos</h3>
                            <div className="grid grid-cols-2 gap-4 relative z-10" suppressHydrationWarning>
                                {[
                                    { label: 'Ordens', icon: ClipboardList, href: '/service-orders/new' },
                                    { label: 'Clientes', icon: Users, href: '/customers' },
                                    { label: 'Financeiro', icon: DollarSign, href: '/cash-register' },
                                    { label: 'Ajustes', icon: Settings, href: '/settings' },
                                ].map(action => (
                                    <Link
                                        key={action.label}
                                        href={action.href}
                                        className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/5 transition-all hover:-translate-y-1 shadow-inner"
                                    >
                                        <action.icon className="w-6 h-6 text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{action.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
