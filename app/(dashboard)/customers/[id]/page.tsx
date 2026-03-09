import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Phone, Mail, MapPin, ClipboardList,
    Calendar, DollarSign, Wallet, TrendingUp,
    ChevronRight, MoreVertical, User
} from 'lucide-react'
import { formatDateTime, formatCurrency, formatPhone, OS_STATUS_LABELS, OS_STATUS_COLORS } from '@/lib/utils'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    const { id } = await params
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    const [
        { data: customer },
        { data: serviceOrders },
        { data: payments }
    ] = await Promise.all([
        db.from('customers').select('*').eq('id', id).eq('company_id', user?.company_id).single(),
        db.from('service_orders').select('*').eq('customer_id', id).eq('company_id', user?.company_id).order('created_at', { ascending: false }),
        db.from('payments').select('*').eq('customer_id', id).eq('company_id', user?.company_id).order('payment_date', { ascending: false })
    ])

    if (!customer) notFound()

    const totalSpent = payments?.filter(p => p.payment_status === 'completed').reduce((s, p) => s + p.amount, 0) || 0
    const pendingAmount = payments?.filter(p => p.payment_status === 'pending').reduce((s, p) => s + p.amount, 0) || 0

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Perfil do Cliente" />

            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Back Link */}
                <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground transition-colors group">
                    <div className="p-1.5 rounded-lg bg-muted/5 border border-border group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    Voltar para Gestão de Clientes
                </Link>

                {/* Profile Header Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-card/60 backdrop-blur-3xl border border-border shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full" />

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                            <div className="w-24 h-24 rounded-3xl bg-muted/20 border border-border flex items-center justify-center text-4xl font-black text-indigo-400 shadow-inner">
                                {customer.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <h1 className="text-3xl font-black text-foreground tracking-tight">{customer.name}</h1>
                                    <p className="text-muted-foreground/30 text-xs font-bold uppercase tracking-[0.2em] mt-1">ID: {customer.id.split('-')[0]}</p>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 text-muted-foreground/60">
                                        <div className="p-2 rounded-xl bg-muted/5 border border-border">
                                            <Phone className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <span className="text-sm font-mono">{formatPhone(customer.phone) || 'Sem telefone'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-muted-foreground/60">
                                        <div className="p-2 rounded-xl bg-muted/5 border border-border">
                                            <Mail className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <span className="text-sm truncate">{customer.email || 'Sem e-mail'}</span>
                                    </div>
                                    <div className="sm:col-span-2 flex items-center gap-3 text-muted-foreground/60">
                                        <div className="p-2 rounded-xl bg-muted/5 border border-border">
                                            <MapPin className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <span className="text-sm">{customer.address ? `${customer.address}, ${customer.city} - ${customer.state}` : 'Sem endereço cadastrado'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="space-y-4">
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border border-emerald-500/20 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <Wallet className="w-5 h-5 text-emerald-400" />
                                <span className="text-xs font-bold text-muted-foreground/30 uppercase tracking-widest">Investimento Total</span>
                            </div>
                            <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(totalSpent)}</p>
                        </div>

                        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-transparent to-transparent border border-amber-500/20 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <DollarSign className="w-5 h-5 text-amber-400" />
                                <span className="text-xs font-bold text-muted-foreground/30 uppercase tracking-widest">Saldo Pendente</span>
                            </div>
                            <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(pendingAmount)}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs / Content Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Activity Feed (Service Orders) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                                <ClipboardList className="w-6 h-6 text-indigo-400" />
                                Histórico de Serviços
                            </h2>
                            <span className="text-xs font-bold text-muted-foreground/20 uppercase tracking-widest">{serviceOrders?.length || 0} Registros</span>
                        </div>

                        <div className="space-y-4">
                            {serviceOrders && serviceOrders.length > 0 ? serviceOrders.map((os) => {
                                const statusClasses = OS_STATUS_COLORS[os.status] || 'border-border text-muted-foreground/40'
                                return (
                                    <Link
                                        key={os.id}
                                        href={`/service-orders/${os.id}`}
                                        className="block p-6 rounded-[2rem] bg-card/40 border border-border hover:border-indigo-500/30 transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-muted/5 border border-border flex items-center justify-center text-muted-foreground/20 group-hover:text-indigo-400 transition-colors">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-foreground tracking-tight text-lg group-hover:text-indigo-400 transition-colors">
                                                        {os.title}
                                                    </h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-wider">#{os.order_number}</span>
                                                        <span className="text-muted-foreground/10 text-[10px]">•</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground/20 uppercase">{formatDateTime(os.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusClasses}`}>
                                                    {OS_STATUS_LABELS[os.status]}
                                                </span>
                                                <p className="mt-2 text-lg font-black text-foreground tracking-tighter">{formatCurrency(os.final_cost || 0)}</p>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            }) : (
                                <div className="p-16 text-center border-2 border-dashed border-border/5 rounded-[2.5rem]">
                                    <User className="w-12 h-12 text-muted-foreground/5 mx-auto mb-4" />
                                    <p className="text-muted-foreground/30 text-sm italic">Nenhum histórico de serviço para este cliente.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CRM / Notes Sidebar */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-foreground">Notas e Preferências</h2>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-card/40 border border-border backdrop-blur-2xl">
                            <textarea
                                readOnly
                                value={customer.notes || 'Sem observações adicionais.'}
                                className="w-full bg-transparent border-none text-sm text-muted-foreground/40 italic leading-relaxed focus:outline-none min-h-[200px] resize-none"
                            />
                        </div>

                        <Link
                            href={`/customers/${customer.id}/edit`}
                            className="p-1 block rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-border/10 group/edit cursor-pointer"
                        >
                            <div className="w-full py-4 rounded-2xl bg-card/80 text-foreground font-black text-xs uppercase tracking-[0.2em] group-hover/edit:bg-transparent transition-all text-center">
                                Editar Perfil Completo
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
