import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import { Plus, Search, Filter, Calendar, User, Wrench, ArrowRight } from 'lucide-react'
import OSActions from '@/components/os/OSActions'
import SearchInput from '@/components/ui/SearchInput'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; glow: string }> = {
    aberta: { label: 'Aberta', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.1)]' },
    agendada: { label: 'Agendada', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.1)]' },
    em_andamento: { label: 'Andamento', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]' },
    concluida: { label: 'Concluída', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]' },
    faturada: { label: 'Faturada', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]' },
    cancelada: { label: 'Cancelada', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    baixa: { label: 'Baixa', color: 'text-slate-400', bg: 'bg-slate-500/10' },
    normal: { label: 'Normal', color: 'text-primary', bg: 'bg-primary/10' },
    alta: { label: 'Alta', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    urgente: { label: 'Urgente', color: 'text-rose-400', bg: 'bg-rose-500/10' },
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
        <div className="animate-fade-in pb-12 bg-background min-h-screen">
            <Header title="Ordens de Serviço" />
            <div className="p-4 lg:p-8 max-w-screen-2xl mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-1 bg-primary rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Controle de Oficina</span>
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black text-foreground tracking-tighter">Gestão de Ordens</h2>
                        <p className="text-muted-foreground font-medium text-base leading-relaxed max-w-xl">Acompanhe e gerencie todas as manutenções da sua oficina em tempo real.</p>
                    </div>
                    <Link
                        href="/service-orders/new"
                        className="flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-[0.1em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 group"
                    >
                        Nova Ordem (OS)
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    </Link>
                </div>

                {/* Toolbar / Filters */}
                <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-4 lg:p-5 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-3 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 scrollbar-hide pr-6">
                        <Link
                            href="/service-orders"
                            className={`px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${!status ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20' : 'bg-muted/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted'}`}
                        >
                            Todas
                        </Link>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <Link
                                key={key}
                                href={`/service-orders?status=${key}`}
                                className={`px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${status === key ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20' : 'bg-muted/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted'}`}
                            >
                                {cfg.label}
                            </Link>
                        ))}
                    </div>

                    {/* Search & Actions */}
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <div className="relative flex-1 xl:w-80 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                            <SearchInput
                                placeholder="OS, cliente, placa..."
                                className="w-full bg-muted/30 border border-white/5 rounded-[1.5rem] pl-12 pr-6 py-4 text-sm font-medium focus:outline-none focus:border-primary/30 transition-all placeholder:opacity-30 h-14"
                            />
                        </div>
                        <button className="h-14 w-14 flex items-center justify-center rounded-[1.5rem] bg-muted/30 border border-white/5 text-muted-foreground/60 hover:text-foreground transition-all">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-muted/20">
                                    <th className="p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] w-32">ID #</th>
                                    <th className="p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Serviço / Dispositivo</th>
                                    <th className="p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Cliente</th>
                                    <th className="p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Técnico</th>
                                    <th className="p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Status</th>
                                    <th className="p-6 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {orders && orders.length > 0 ? (
                                    orders.map((order: any) => {
                                        const statusCfg = STATUS_CONFIG[order.status]
                                        const priorityCfg = PRIORITY_CONFIG[order.priority]
                                        return (
                                            <tr
                                                key={order.id}
                                                className="group hover:bg-white/5 transition-all duration-300"
                                            >
                                                <td className="p-6 align-middle">
                                                    <span className="text-xs font-black text-muted-foreground/40 font-mono tracking-tighter">
                                                        {order.order_number}
                                                    </span>
                                                </td>
                                                <td className="p-6 align-middle">
                                                    <div className="space-y-1">
                                                        <Link href={`/service-orders/${order.id}`} className="text-base font-black text-foreground group-hover:text-primary transition-colors tracking-tight block">
                                                            {order.title}
                                                        </Link>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDate(order.created_at)}
                                                            </div>
                                                            <div className={cn(
                                                                "h-1 w-1 rounded-full",
                                                                priorityCfg?.color === 'text-primary' ? 'bg-primary' :
                                                                    priorityCfg?.color === 'text-orange-400' ? 'bg-orange-400' :
                                                                        priorityCfg?.color === 'text-rose-400' ? 'bg-rose-400' : 'bg-slate-400'
                                                            )} />
                                                            <span className={cn("text-[9px] font-black uppercase tracking-widest", priorityCfg?.color)}>
                                                                {priorityCfg?.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 align-middle">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                            <User className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-foreground font-black group-hover:translate-x-1 transition-transform">
                                                                {order.customers?.name || 'Cliente Avulso'}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground/40 font-medium">{order.customers?.phone || 'Sem contato'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 align-middle">
                                                    <span className="text-xs font-bold text-foreground/60 italic">
                                                        {order.technicians?.name || 'Não atribuído'}
                                                    </span>
                                                </td>
                                                <td className="p-6 align-middle">
                                                    {statusCfg && (
                                                        <div className={cn(
                                                            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                                            statusCfg.bg, statusCfg.text, statusCfg.border, statusCfg.glow
                                                        )}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                            {statusCfg.label}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-6 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link
                                                            href={`/service-orders/${order.id}`}
                                                            className="p-3 rounded-xl bg-muted/40 hover:bg-primary hover:text-primary-foreground transition-all"
                                                        >
                                                            <ArrowRight className="w-4 h-4" />
                                                        </Link>
                                                        <OSActions os={order} variant="list" />
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-32 text-center">
                                            <div className="w-24 h-24 rounded-[2rem] bg-muted/20 border border-white/5 flex items-center justify-center mx-auto mb-6">
                                                <Wrench className="w-10 h-10 text-muted-foreground/20" />
                                            </div>
                                            <h3 className="text-2xl font-black tracking-tight text-foreground/60">Silêncio na Oficina...</h3>
                                            <p className="text-muted-foreground/40 text-sm mt-2 mb-10 max-w-xs mx-auto">Você ainda não possui ordens de serviço. Clique abaixo para iniciar.</p>
                                            <Link
                                                href="/service-orders/new"
                                                className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-105"
                                            >
                                                <Plus className="w-5 h-5" />
                                                Abrir minha 1ª OS
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

