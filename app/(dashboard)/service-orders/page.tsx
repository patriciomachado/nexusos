import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Filter, MoreHorizontal, Calendar, User, Wrench } from 'lucide-react'
import OSActions from '@/components/os/OSActions'
import SearchInput from '@/components/ui/SearchInput'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; glow: string }> = {
    aberta: { label: 'Aberta', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]' },
    agendada: { label: 'Agendada', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.2)]' },
    em_andamento: { label: 'Em Andamento', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.2)]' },
    aguardando_pecas: { label: 'Aguard. Peças', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]' },
    concluida: { label: 'Concluída', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]' },
    faturada: { label: 'Faturada', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', glow: 'shadow-[0_0_10px_rgba(99,102,241,0.2)]' },
    cancelada: { label: 'Cancelada', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    baixa: { label: 'Baixa', color: 'text-slate-400', bg: 'bg-slate-500/10' },
    normal: { label: 'Normal', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    alta: { label: 'Alta', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    urgente: { label: 'Urgente', color: 'text-red-400', bg: 'bg-red-500/10' },
}

export default async function ServiceOrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; priority?: string; search?: string }>
}) {
    const { userId } = await auth()
    const { status, priority, search } = await searchParams
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id, role').eq('clerk_id', userId!).single()
    const companyId = user?.company_id

    if (user?.role === 'cashier') {
        redirect('/dashboard')
    }

    let query = db
        .from('service_orders')
        .select('*, customers(name, phone), technicians(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (search) query = query.or(`title.ilike.%${search}%,order_number.ilike.%${search}%`)

    const { data: orders } = await query.limit(50)

    return (
        <div className="animate-fade-in pb-12 bg-background min-h-screen transition-colors duration-300">
            <Header title="Ordens de Serviço" />
            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">Gerenciar Ordens</h2>
                        <p className="text-muted-foreground mt-1">Acompanhe todas as manutenções e serviços da oficina.</p>
                    </div>
                    <Link
                        href="/service-orders/new"
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-[0_4px_20px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" />
                        Nova Ordem (OS)
                    </Link>
                </div>

                {/* Toolbar / Filters */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
                        <Link
                            href="/service-orders"
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${!status ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        >
                            Todas
                        </Link>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <Link
                                key={key}
                                href={`/service-orders?status=${key}`}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${status === key ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            >
                                {cfg.label}
                            </Link>
                        ))}
                    </div>

                    {/* Search & Actions */}
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="w-full lg:w-64">
                            <SearchInput
                                placeholder="Buscar OS, cliente..."
                                className="w-full bg-muted/50 border border-border/50 focus:border-primary/50 rounded-xl pl-11 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                            />
                        </div>
                        <button className="p-2.5 rounded-xl bg-muted/50 border border-border/50 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors shrink-0">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-card/60 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none rounded-2xl" />
                    <div className="relative z-10">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/50 bg-muted/30">
                                    <th className="p-4 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Número OS</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Detalhes</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Cliente</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Técnico</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Prioridade</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {orders && orders.length > 0 ? (
                                    orders.map((order: any) => {
                                        const statusCfg = STATUS_CONFIG[order.status]
                                        const priorityCfg = PRIORITY_CONFIG[order.priority]
                                        return (
                                            <tr
                                                key={order.id}
                                                className="group hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 relative"
                                            >
                                                <td className="p-4 align-middle">
                                                    <Link href={`/service-orders/${order.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-mono text-foreground/80 group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary transition-colors">
                                                        <Wrench className="w-3.5 h-3.5 opacity-50" />
                                                        {order.order_number}
                                                    </Link>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div>
                                                        <Link href={`/service-orders/${order.id}`} className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                                            {order.title}
                                                        </Link>
                                                        <div className="flex items-center gap-2 mt-1 text-muted-foreground/40 text-xs">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(order.created_at)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-border flex items-center justify-center shrink-0">
                                                            <User className="w-4 h-4 text-indigo-300" />
                                                        </div>
                                                        <span className="text-sm text-foreground font-semibold">
                                                            {order.customers?.name || <span className="text-muted-foreground/40 italic">Sem Cliente</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle text-sm text-foreground/80">
                                                    {order.technicians?.name || <span className="text-muted-foreground/40 italic">Não Atribuído</span>}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {statusCfg && (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} ${statusCfg.glow}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full bg-current opacity-70`}></span>
                                                            {statusCfg.label}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${priorityCfg?.bg} ${priorityCfg?.color}`}>
                                                        {priorityCfg?.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <OSActions os={order} variant="list" />
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-16 text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto mb-4">
                                                <Search className="w-8 h-8 text-muted-foreground/20" />
                                            </div>
                                            <p className="text-muted-foreground/60 font-medium text-base mb-1">Nenhuma OS encontrada.</p>
                                            <p className="text-muted-foreground/40 text-sm mb-6">Comece criando sua primeira Ordem de Serviço da oficina.</p>
                                            <Link
                                                href="/service-orders/new"
                                                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/80 text-primary-foreground px-5 py-2.5 rounded-xl font-medium shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Criar OS
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}
