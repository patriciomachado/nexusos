import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from '@/lib/utils'
import RegisterPaymentButton from '@/components/payments/RegisterPaymentButton'
import { DollarSign, TrendingUp, Calendar, CreditCard, Search, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react'
import SearchInput from '@/components/ui/SearchInput'

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, border: string }> = {
    completed: { label: 'Pago', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    pending: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    failed: { label: 'Falhou', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    refunded: { label: 'Reembolsado', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    partial: { label: 'Parcial', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
}

export default async function PaymentsPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string, status?: string }>
}) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('role').eq('clerk_id', userId).single()
    if (currentUser?.role === 'technician' || currentUser?.role === 'cashier' || currentUser?.role === 'attendant') {
        redirect('/dashboard')
    }

    const { search, status } = await searchParams
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    const [{ data: payments }, { data: customers }, { data: orders }] = await Promise.all([
        db.from('payments').select('*, customers(name), service_orders(order_number, title)').eq('company_id', user?.company_id).order('payment_date', { ascending: false }).limit(100),
        db.from('customers').select('id, name').eq('company_id', user?.company_id).eq('is_active', true).order('name'),
        db.from('service_orders').select('id, order_number, title').eq('company_id', user?.company_id).in('status', ['concluida', 'em_andamento']).order('created_at', { ascending: false }).limit(50),
    ])

    let filteredPayments = payments || []
    if (search) {
        const s = search.toLowerCase()
        filteredPayments = filteredPayments.filter((p: any) =>
            p.customers?.name?.toLowerCase().includes(s) ||
            p.service_orders?.order_number?.toLowerCase().includes(s) ||
            p.service_orders?.title?.toLowerCase().includes(s)
        )
    }

    const totalReceived = filteredPayments.filter((p: any) => p.payment_status === 'completed').reduce((s: number, p: any) => s + p.amount, 0) || 0
    const totalPending = filteredPayments.filter((p: any) => p.payment_status === 'pending').reduce((s: number, p: any) => s + p.amount, 0) || 0
    const countCompleted = filteredPayments.filter((p: any) => p.payment_status === 'completed').length || 0

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header
                title="Fluxo Financeiro"
                subtitle="Gestão inteligente de entradas, saídas e liquidações de ordens de serviço."
            />

            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 p-8 rounded-3xl bg-card border border-border backdrop-blur-2xl relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground/80 uppercase tracking-widest">Receita Total</span>
                            </div>
                            <p className="text-4xl font-black text-foreground tracking-tighter mb-2">{formatCurrency(totalReceived)}</p>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    {countCompleted} transações concluídas
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-card border border-border backdrop-blur-xl relative group shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Pendente</span>
                            </div>
                            <p className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(totalPending)}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono uppercase tracking-widest">Aguardando Liquidação</p>
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-card border border-border backdrop-blur-xl flex flex-col justify-center items-center group shadow-lg">
                        <RegisterPaymentButton customers={customers || []} orders={orders || []} companyId={user?.company_id} />
                        <p className="text-[10px] text-muted-foreground/20 mt-4 font-mono uppercase tracking-widest text-center">Registrar novo recebimento</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="w-full md:w-96">
                        <SearchInput
                            placeholder="Buscar por cliente ou número de OS..."
                            className="w-full bg-muted/60 border border-border rounded-xl py-3 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-md"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-muted/50 border border-border text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all text-sm font-medium">
                            <Filter className="w-4 h-4" />
                            Filtrar Período
                        </button>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="rounded-3xl border border-border bg-card/40 backdrop-blur-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="text-left p-5 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Data / Hora</th>
                                    <th className="text-left p-5 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Cliente / Origem</th>
                                    <th className="text-left p-5 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Ordem de Serviço</th>
                                    <th className="text-left p-5 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Método</th>
                                    <th className="text-right p-5 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Valor</th>
                                    <th className="p-5 text-center text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Status</th>
                                    <th className="p-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredPayments.length > 0 ? filteredPayments.map((p: any) => {
                                    const cfg = STATUS_CONFIG[p.payment_status] || { label: p.payment_status, color: 'text-muted-foreground/40', bg: 'bg-muted/5', border: 'border-border/10' }

                                    return (
                                        <tr key={p.id} className="group hover:bg-muted/40 transition-all">
                                            <td className="p-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground/70">{formatDateTime(p.payment_date).split(',')[0]}</span>
                                                    <span className="text-[10px] text-muted-foreground/60 font-mono italic">{formatDateTime(p.payment_date).split(',')[1]}</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                                                        {(p.customers?.name || '?').charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                                                        {p.customers?.name || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-mono text-primary font-bold">#{p.service_orders?.order_number || 'N/A'}</span>
                                                    <span className="text-[10px] text-muted-foreground/60 truncate max-w-[150px]">{p.service_orders?.title || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground/20" />
                                                    <span className="text-xs text-foreground/60 font-medium">
                                                        {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <span className="text-base font-black text-foreground tracking-tight">
                                                    {formatCurrency(p.amount)}
                                                </span>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="flex justify-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${cfg.bg} ${cfg.color} border ${cfg.border} shadow-lg shadow-black/20`}>
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <button className="p-2 text-muted-foreground/40 hover:text-foreground transition-colors">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr>
                                        <td colSpan={7} className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center border border-border rotate-12">
                                                    <DollarSign className="w-8 h-8 text-muted-foreground/20" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-xl font-bold text-muted-foreground/60 tracking-tight">Sem atividades financeiras</p>
                                                    <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto">Seu fluxo de caixa aparecerá aqui assim que você registrar o primeiro pagamento.</p>
                                                </div>
                                            </div>
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
