'use client'

import { useState, useMemo } from 'react'
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    User,
    TrendingUp,
    MapPin,
    Search,
    Filter,
    PenTool,
    ClipboardList
} from 'lucide-react'
import { cn, APPOINTMENT_STATUS_LABELS } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { toast } from 'sonner'
import AppointmentForm from './AppointmentForm'
import { Group, PrimaryButton, SecondaryButton } from '@/components/ui/form'

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 px-4 min-h-[52px]">
            {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
            <span className="text-[17px] text-foreground shrink-0">{label}</span>
            <span className="ml-auto text-[17px] text-muted-foreground text-right truncate">{value}</span>
        </div>
    )
}

interface AppointmentsCalendarProps {
    initialAppointments: any[]
    customers: any[]
    technicians: any[]
    serviceOrders: any[]
}

export default function AppointmentsCalendar({
    initialAppointments,
    customers,
    technicians,
    serviceOrders
}: AppointmentsCalendarProps) {
    const router = useRouter()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState<'month' | 'week' | 'day'>('month')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedDateInModal, setSelectedDateInModal] = useState<Date | null>(null)
    const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    const grouped = useMemo(() => {
        return initialAppointments.reduce((acc: Record<string, any[]>, apt: any) => {
            const date = new Date(apt.scheduled_date).toISOString().split('T')[0]
            if (!acc[date]) acc[date] = []
            acc[date].push(apt)
            return acc
        }, {})
    }, [initialAppointments])

    const next = () => {
        if (view === 'month') setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
        else if (view === 'week') setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000))
        else setCurrentDate(new Date(currentDate.getTime() + 86400000))
    }

    const prev = () => {
        if (view === 'month') setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
        else if (view === 'week') setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000))
        else setCurrentDate(new Date(currentDate.getTime() - 86400000))
    }

    const goToToday = () => setCurrentDate(new Date())

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayAppts = grouped[todayStr] || []

    const handleDayClick = (dayStr: string) => {
        // Use T12:00:00 to avoid timezone shifts showing previous day
        setSelectedDateInModal(new Date(dayStr + 'T12:00:00'))
        setIsEditing(false)
        setIsCreateModalOpen(true)
    }

    const openAppointment = (appt: any) => {
        setSelectedAppointment(appt)
    }

    // Keep the appointment selected: the form edits it (the details sheet
    // hides while isEditing).
    const handleEdit = () => {
        setIsEditing(true)
        setIsCreateModalOpen(true)
    }

    const [confirmCancel, setConfirmCancel] = useState(false)
    const cancelAppointment = async () => {
        if (!selectedAppointment) return
        setConfirmCancel(false)
        const res = await fetch('/api/appointments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedAppointment.id, status: 'cancelled' }),
        })
        if (res.ok) {
            toast.success('Agendamento cancelado')
            setSelectedAppointment(null)
            router.refresh()
        } else {
            toast.error('Não foi possível cancelar. Tente de novo.')
        }
    }

    const handleRefresh = () => {
        router.refresh()
    }

    // View Components
    const MonthView = () => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

        return (
            <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto lg:overflow-visible">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-r border-b border-border/10 bg-muted/[0.01]" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dayDate = new Date(currentYear, currentMonth, day)
                    const dStr = dayDate.toISOString().split('T')[0]
                    const appts = grouped[dStr] || []
                    const isToday = dStr === todayStr

                    return (
                        <div
                            key={day}
                            className={cn(
                                "border-r border-b border-border/10 p-2 lg:p-4 hover:bg-muted/[0.05] transition-colors relative min-h-[120px] group cursor-pointer",
                                isToday && "bg-primary/[0.03]"
                            )}
                        >
                            <span className={cn(
                                "text-sm font-semibold mb-2 block transition-colors",
                                isToday ? "text-primary flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 -ml-1.5 -mt-1.5" : "text-muted-foreground group-hover:text-muted-foreground"
                            )}>{day}</span>
                            <div className="space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-hide">
                                {appts.map((a: any) => (
                                    <div
                                        key={a.id}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            openAppointment(a)
                                        }}
                                        className={cn(
                                            "px-2 py-1 rounded-lg text-xs font-semibold tracking-tighter truncate border transition duration-300 cursor-pointer",
                                            a.status === 'scheduled' ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" :
                                                a.status === 'confirmed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" :
                                                    a.status === 'completed' ? "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20" :
                                                        "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
                                        )}
                                    >
                                        {a.service_orders?.title || 'Compromisso'}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleDayClick(dStr)
                                }}
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-muted/20 opacity-0 group-hover:opacity-100 transition hover:bg-primary hover:text-white"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    )
                })}
            </div>
        )
    }

    const WeekView = () => {
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

        return (
            <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                {Array.from({ length: 7 }).map((_, i) => {
                    const dayDate = new Date(startOfWeek)
                    dayDate.setDate(startOfWeek.getDate() + i)
                    const dStr = dayDate.toISOString().split('T')[0]
                    const appts = grouped[dStr] || []
                    const isToday = dStr === todayStr

                    return (
                        <div key={i} className={cn("border-r border-b border-border/10 p-4", isToday && "bg-primary/[0.03]")}>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                                {dayDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </div>
                            <div className={cn("text-lg font-black mb-4", isToday ? "text-primary" : "text-foreground")}>
                                {dayDate.getDate()}
                            </div>
                            <div className="space-y-2">
                                {appts.map((a: any) => (
                                    <div
                                        key={a.id}
                                        onClick={() => openAppointment(a)}
                                        className="p-3 rounded-xl border border-border/60 bg-foreground/[0.03] cursor-pointer hover:bg-foreground/[0.05] transition duration-300"
                                    >
                                        <div className="text-[11px] font-semibold text-primary mb-1">
                                            {new Date(a.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-[11px] font-bold truncate">{a.service_orders?.title || 'Compromisso'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const DayView = () => {
        const dStr = currentDate.toISOString().split('T')[0]
        const appts = grouped[dStr] || []

        return (
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-4">
                    {appts.length > 0 ? appts.map((a: any) => (
                        <div
                            key={a.id}
                            onClick={() => openAppointment(a)}
                            className="p-6 rounded-2xl border border-border/60 bg-foreground/[0.03] cursor-pointer transition duration-300 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-6">
                                <div className="text-xl font-black text-primary">
                                    {new Date(a.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black">{a.service_orders?.title || 'Compromisso'}</h3>
                                    <p className="text-xs text-muted-foreground">{a.customers?.name}</p>
                                </div>
                            </div>
                            <div className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-semibold border",
                                a.status === 'scheduled' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                    a.status === 'confirmed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                        "bg-orange-500/10 border-orange-500/20 text-orange-400"
                            )}>
                                {APPOINTMENT_STATUS_LABELS[a.status] || a.status}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-20 opacity-20">
                            <Clock className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-sm font-semibold">Sem compromissos para hoje</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-8 overflow-y-auto lg:overflow-hidden" suppressHydrationWarning>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8" suppressHydrationWarning>
                <div suppressHydrationWarning>
                    <div className="flex items-center gap-3 mb-1" suppressHydrationWarning>
                        <h1 className="text-3xl font-black tracking-tighter capitalize">
                            {view === 'day' ? currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : monthName}
                        </h1>
                        <div className="flex items-center bg-card/60 border border-border/20 rounded-xl p-1 ml-4" suppressHydrationWarning>
                            <button onClick={prev} className="p-1.5 hover:bg-muted/30 rounded-lg transition-colors text-muted-foreground hover:text-primary">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={goToToday} className="px-3 text-[13px] font-semibold text-muted-foreground hover:text-primary transition-colors">Hoje</button>
                            <button onClick={next} className="p-1.5 hover:bg-foreground/[0.05] rounded-lg transition-colors text-muted-foreground hover:text-primary">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">Central de Agendamentos Nexus OS</p>
                </div>

                <div className="flex items-center gap-4" suppressHydrationWarning>
                    <div className="hidden sm:flex bg-card/60 border border-border/20 rounded-2xl p-1" suppressHydrationWarning>
                        {(['month', 'week', 'day'] as const).map(v => (
                            <button
 key={v}
 onClick={() => setView(v)}
 className={cn(
 "px-5 py-2 rounded-xl text-[13px] font-semibold transition",
 view === v ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
 )}
 >
                                {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                            </button>
                        ))}
                    </div>
                    <button
 onClick={() => {
 setIsEditing(false)
 setSelectedAppointment(null)
 setSelectedDateInModal(null)
 setIsCreateModalOpen(true)
 }}
 className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground active:scale-95 transition font-semibold text-[13px]"
 >
                        <Plus className="w-4 h-4" />
                        <span>Novo Agendamento</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden" suppressHydrationWarning>
                {/* Calendar View Area */}
                <div className="flex-1 flex flex-col glass-premium rounded-2xl overflow-hidden border border-border/20" suppressHydrationWarning>
                    {view === 'month' && (
                        <div className="grid grid-cols-7 border-b border-border/10 bg-muted/10" suppressHydrationWarning>
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
                                <div key={day} className="py-4 text-center text-xs font-semibold text-muted-foreground">{day}</div>
                            ))}
                        </div>
                    )}

                    {view === 'month' ? <MonthView /> : view === 'week' ? <WeekView /> : <DayView />}
                </div>

                {/* Sidebar Summary */}
                <div className="hidden xl:flex w-80 flex-col animate-in slide-in-from-right duration-700" suppressHydrationWarning>
                    <div className="mb-8" suppressHydrationWarning>
                        <h2 className="text-xl font-black tracking-tight mb-2">Resumo do Dia</h2>
                        <p className="text-xs font-semibold text-primary">{today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide pr-2" suppressHydrationWarning>
                        {todayAppts.length > 0 ? todayAppts.map((a: any) => (
                            <div
                                key={a.id}
                                onClick={() => openAppointment(a)}
                                className="relative pl-6 border-l-2 border-primary/30 py-3 group cursor-pointer hover:border-primary transition duration-300 rounded-r-2xl hover:bg-foreground/[0.05]"
                                suppressHydrationWarning
                            >
                                <div className="absolute left-[-5px] top-4 w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)] group-hover:scale-125 transition-transform" suppressHydrationWarning />
                                <div className="text-[11px] font-semibold text-muted-foreground mb-1" suppressHydrationWarning>{new Date(a.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{a.service_orders?.title || 'Compromisso'}</h3>
                                <div className="flex items-center gap-2 mt-2" suppressHydrationWarning>
                                    <div className="w-6 h-6 rounded-lg bg-muted/20 flex items-center justify-center" suppressHydrationWarning>
                                        <User className="w-3 h-3 text-muted-foreground" suppressHydrationWarning />
                                    </div>
                                    <span className="text-[11px] font-bold text-muted-foreground transition-colors" suppressHydrationWarning>{a.customers?.name || 'Cliente Direto'}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 opacity-20" suppressHydrationWarning>
                                <Clock className="w-12 h-12 mx-auto mb-4" suppressHydrationWarning />
                                <p className="text-xs font-semibold" suppressHydrationWarning>Sem compromissos</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-border/20" suppressHydrationWarning>
                        <div className="glass-premium rounded-2xl p-6 bg-primary/5 border-primary/20 hover:border-primary/40 transition cursor-default group" suppressHydrationWarning>
                            <div className="flex items-center justify-between mb-4" suppressHydrationWarning>
                                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center group-hover:rotate-6 transition-transform" suppressHydrationWarning>
                                    <TrendingUp className="w-5 h-5 text-white" suppressHydrationWarning />
                                </div>
                                <span className="text-xs font-semibold text-primary" suppressHydrationWarning>Nexus Insight</span>
                            </div>
                            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed" suppressHydrationWarning>Monitore o <span className="text-white font-bold">fluxo de agendamentos</span> para otimizar sua equipe.</p>
                        </div>
                    </div>
                </div>
            </div>

            <Sheet
                open={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false)
                    setSelectedDateInModal(null)
                    setSelectedAppointment(null)
                    setIsEditing(false)
                }}
                title={isEditing ? 'Editar agendamento' : 'Novo agendamento'}
                subtitle={isEditing ? undefined : (selectedDateInModal ? selectedDateInModal.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : undefined)}
                size="lg"
                full
            >
                <AppointmentForm
                    onClose={() => {
                        setIsCreateModalOpen(false)
                        setSelectedAppointment(null)
                        setIsEditing(false)
                    }}
                    customers={customers}
                    technicians={technicians}
                    serviceOrders={serviceOrders}
                    appointment={isEditing ? selectedAppointment : undefined}
                    initialDate={selectedDateInModal}
                    onSuccess={handleRefresh}
                />
            </Sheet>

            <Sheet
                open={!!selectedAppointment && !isEditing}
                onClose={() => setSelectedAppointment(null)}
                title="Agendamento"
                subtitle={selectedAppointment?.service_orders?.title || undefined}
                footer={selectedAppointment && (
                    <>
                        {selectedAppointment.status !== 'cancelled' && (
                            <SecondaryButton className="text-red-600 dark:text-red-400" onClick={() => setConfirmCancel(true)}>Cancelar</SecondaryButton>
                        )}
                        <PrimaryButton className="flex-1" onClick={handleEdit}>Editar</PrimaryButton>
                    </>
                )}
            >
                {selectedAppointment && (
                    <Group>
                        <InfoRow icon={<Clock aria-hidden className="w-4 h-4" />} label="Horário" value={new Date(selectedAppointment.scheduled_date).toLocaleString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })} />
                        <InfoRow icon={<User aria-hidden className="w-4 h-4" />} label="Cliente" value={selectedAppointment.customers?.name || 'Sem cliente'} />
                        <InfoRow icon={<PenTool aria-hidden className="w-4 h-4" />} label="Técnico" value={selectedAppointment.technicians?.name || 'Não atribuído'} />
                        <InfoRow label="Situação" value={APPOINTMENT_STATUS_LABELS[selectedAppointment.status] || selectedAppointment.status} />
                        {selectedAppointment.service_orders && (
                            <Link
                                href={`/service-orders/${selectedAppointment.service_order_id}`}
                                className="flex items-center gap-3 px-4 min-h-[52px] hover:bg-foreground/[0.03] transition-colors"
                            >
                                <ClipboardList aria-hidden className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="flex-1 min-w-0 text-[17px] text-primary truncate">OS #{selectedAppointment.service_orders.order_number} {selectedAppointment.service_orders.title}</span>
                                <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                            </Link>
                        )}
                        {selectedAppointment.notes && <p className="px-4 py-3 text-[15px] text-muted-foreground whitespace-pre-wrap break-words">{selectedAppointment.notes}</p>}
                    </Group>
                )}
            </Sheet>

            <PremiumConfirmDialog
                isOpen={confirmCancel}
                title="Cancelar agendamento?"
                description="Ele continua na agenda, marcado como cancelado."
                confirmLabel="Cancelar agendamento"
                cancelLabel="Voltar"
                onConfirm={cancelAppointment}
                onCancel={() => setConfirmCancel(false)}
            />
        </div>
    )
}
