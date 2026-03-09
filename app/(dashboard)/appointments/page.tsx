import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; glow: string }> = {
    scheduled: { label: 'Agendado', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]' },
    confirmed: { label: 'Confirmado', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]' },
    in_progress: { label: 'Em Andamento', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.2)]' },
    completed: { label: 'Concluído', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.2)]' },
    cancelled: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]' },
    rescheduled: { label: 'Reagendado', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]' },
}

export default async function AppointmentsPage() {
    const { userId } = await auth()
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    const { data: appointments } = await db
        .from('appointments')
        .select('*, technicians(name), customers(name), service_orders(title, order_number)')
        .eq('company_id', user?.company_id)
        .gte('scheduled_date', todayStr)
        .lte('scheduled_date', nextMonth)
        .order('scheduled_date')

    // Group appointments by date
    const grouped = (appointments || []).reduce((acc: Record<string, any[]>, apt: any) => {
        const date = apt.scheduled_date.split('T')[0]
        if (!acc[date]) acc[date] = []
        acc[date].push(apt)
        return acc
    }, {})

    const sortedDates = Object.keys(grouped).sort()

    return (
        <div className="animate-fade-in pb-12 bg-background min-h-screen transition-colors duration-300">
            <Header title="Agenda e Compromissos" />
            <div className="p-6 max-w-6xl mx-auto space-y-6">

                {/* Top Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">Próximos Agendamentos</h2>
                        <p className="text-muted-foreground mt-1">
                            Você tem <span className="text-primary font-semibold">{appointments?.length || 0} compromissos</span> marcados para os próximos 30 dias.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-card/60 backdrop-blur-xl border border-border rounded-xl p-1 shadow-lg">
                            <button className="p-2 text-muted-foreground/40 hover:text-foreground hover:bg-muted rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                            <div className="px-4 py-2 text-sm font-medium text-foreground flex items-center">Maio 2026</div>
                            <button className="p-2 text-muted-foreground/40 hover:text-foreground hover:bg-muted rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-medium shadow-[0_4px_20px_rgba(99,102,241,0.2)] transition-all hover:-translate-y-0.5 shrink-0">
                            <Plus className="w-5 h-5" />
                            Novo
                        </button>
                    </div>
                </div>

                {appointments && appointments.length > 0 ? (
                    <div className="space-y-8 mt-8">
                        {sortedDates.map((dateStr) => {
                            const dateObj = new Date(dateStr)
                            const isToday = dateStr === todayStr
                            const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })
                            const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

                            return (
                                <div key={dateStr} className="relative">
                                    {/* Date Header */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${isToday ? 'bg-primary border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)] text-primary-foreground' : 'bg-card border-border text-foreground/80 shadow-sm'}`}>
                                            <span className="text-xs uppercase font-semibold tracking-wider opacity-80">{dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                            <span className="text-xl font-bold leading-tight">{dateObj.getDate()}</span>
                                        </div>
                                        <div className="h-px bg-gradient-to-r from-border to-transparent flex-1" />
                                    </div>

                                    {/* Appts List */}
                                    <div className="pl-18 space-y-4 sm:ml-18">
                                        {grouped[dateStr].map((a: any) => {
                                            const status = STATUS_CONFIG[a.status] || { label: a.status, bg: 'bg-card', text: 'text-muted-foreground/50', border: 'border-border', glow: '' }

                                            return (
                                                <div key={a.id} className="group relative p-5 rounded-2xl bg-card/60 backdrop-blur-xl border border-border overflow-hidden hover:border-primary/20 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-border flex items-center justify-center shrink-0">
                                                                <Clock className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <div>
                                                                <Link href={a.service_orders ? `/service-orders/${a.service_orders.id}` : '#'} className="text-lg font-bold text-foreground group-hover:text-primary transition-colors inline-block">
                                                                    {a.service_orders?.title || a.title || 'Manutenção Agendada'}
                                                                </Link>
                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground/60">
                                                                    <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
                                                                        <span className="font-medium text-foreground/80">{new Date(a.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                    {a.customers?.name && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <User className="w-3.5 h-3.5 text-muted-foreground/40" />
                                                                            <span>{a.customers.name}</span>
                                                                        </div>
                                                                    )}
                                                                    {a.location_address && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/40" />
                                                                            <span className="truncate max-w-[200px]">{a.location_address}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 pl-16 sm:pl-0">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.text} ${status.border} ${status.glow}`}>
                                                                {status.label}
                                                            </span>
                                                            {a.technicians?.name && (
                                                                <span className="text-xs text-muted-foreground/40 font-medium">
                                                                    Téc: <span className="text-foreground/70">{a.technicians.name}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="mt-12 p-16 text-center bg-card/40 backdrop-blur-md border border-border rounded-3xl">
                        <div className="w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <CalendarIcon className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Sua agenda está livre</h3>
                        <p className="text-muted-foreground/50 text-base max-w-md mx-auto mb-8">Não há nenhum compromisso marcado para os próximos 30 dias. Os agendamentos aparecem aqui quando uma OS é criada com data marcada.</p>
                        <button className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-colors">
                            <Plus className="w-5 h-5" />
                            Agendar Serviço
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
