'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import { LayoutGrid, Calendar as CalendarIcon, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import AppointmentsCalendar from '@/components/appointments/AppointmentsCalendar'
import MesaKanbanClient from './MesaKanbanClient'
import { useRouter } from 'next/navigation'

interface MesaClientProps {
    initialAppointments: any[]
    customers: any[]
    technicians: any[]
    serviceOrders: any[]
    paymentMethods: any[]
    hasOpenRegister: boolean
    openRegisterId: string | null
}

export default function MesaClient({
    initialAppointments,
    customers,
    technicians,
    serviceOrders,
    paymentMethods,
    hasOpenRegister,
    openRegisterId
}: MesaClientProps) {
    const [activeTab, setActiveTab] = useState<'kanban' | 'calendar'>('kanban')
    const router = useRouter()

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 lg:pb-12 flex flex-col w-full">
            <Header 
                title="Mesa / Fluxo de Trabalho" 
                subtitle="Acompanhamento visual de bancada, status de reparo e agendamentos." 
            />

            <main className="px-4 lg:px-8 py-4 flex-1 flex flex-col max-w-7xl mx-auto w-full space-y-6">
                {/* View Selector Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="inline-flex p-1 bg-white/[0.02] border border-white/5 rounded-xl self-start">
                        <button
                            onClick={() => setActiveTab('kanban')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                                activeTab === 'kanban' 
                                    ? "bg-primary text-primary-foreground shadow-lg" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Quadro Kanban
                        </button>
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                                activeTab === 'calendar' 
                                    ? "bg-primary text-primary-foreground shadow-lg" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <CalendarIcon className="w-4 h-4" />
                            Calendário de Visitas
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.refresh()}
                            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-muted-foreground hover:text-foreground hover:border-white/10 transition-all active:scale-95"
                            title="Atualizar dados"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    {activeTab === 'kanban' ? (
                        <MesaKanbanClient
                            serviceOrders={serviceOrders}
                            paymentMethods={paymentMethods}
                            hasOpenRegister={hasOpenRegister}
                            openRegisterId={openRegisterId}
                            technicians={technicians}
                            customers={customers}
                        />
                    ) : (
                        <div className="glass-premium bg-card/40 border border-white/5 rounded-3xl p-2 flex-1 flex flex-col min-h-0 overflow-hidden shadow-2xl">
                            <AppointmentsCalendar
                                initialAppointments={initialAppointments}
                                customers={customers}
                                technicians={technicians}
                                serviceOrders={serviceOrders}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
