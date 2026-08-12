'use client'

import { useState, useMemo } from 'react'
import {
    Clock, User, CheckSquare, Plus, Search, AlertCircle, Filter, 
    CheckCircle2, Wrench, PackageOpen, DollarSign, UserCheck, 
    ArrowRight, Check, X, ShieldAlert, Award, CalendarDays
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface MesaKanbanClientProps {
    serviceOrders: any[]
    paymentMethods: any[]
    hasOpenRegister: boolean
    openRegisterId: string | null
    technicians: any[]
    customers: any[]
}

const COLUMNS = [
    { id: 'aberta', title: 'Triagem / Aberta', accent: 'border-t-blue-500 text-blue-400', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { id: 'agendada', title: 'Agendadas', accent: 'border-t-indigo-500 text-indigo-400', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { id: 'em_andamento', title: 'Na Bancada / Reparo', accent: 'border-t-amber-500 text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { id: 'aguardando_pecas', title: 'Aguardando Peças', accent: 'border-t-orange-500 text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    { id: 'concluida', title: 'Pronto / Testes', accent: 'border-t-emerald-500 text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { id: 'faturada', title: 'Faturadas', accent: 'border-t-cyan-500 text-cyan-400', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
]

const PRIORITY_LABELS: Record<string, { label: string; style: string }> = {
    baixa: { label: 'Baixa', style: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
    normal: { label: 'Normal', style: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25' },
    alta: { label: 'Alta', style: 'bg-orange-500/10 text-orange-400 border-orange-500/25' },
    urgente: { label: 'Urgente', style: 'bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse' },
}

export default function MesaKanbanClient({
    serviceOrders: initialServiceOrders,
    paymentMethods,
    hasOpenRegister,
    openRegisterId,
    technicians,
    customers
}: MesaKanbanClientProps) {
    const [serviceOrdersList, setServiceOrdersList] = useState(initialServiceOrders)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTechFilter, setSelectedTechFilter] = useState('all')
    const [activeDragId, setActiveDragId] = useState<string | null>(null)

    // Checkout modal state
    const [checkoutOS, setCheckoutOS] = useState<any | null>(null)
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('')
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)

    // Card Detail Panel
    const [selectedOSDetails, setSelectedOSDetails] = useState<any | null>(null)
    const [isSavingDetails, setIsSavingDetails] = useState(false)

    // Calculate bench stats
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]
        
        const naBancada = serviceOrdersList.filter(o => o.status === 'em_andamento').length
        const aguardandoPecas = serviceOrdersList.filter(o => o.status === 'aguardando_pecas').length
        const novasEntradas = serviceOrdersList.filter(o => o.status === 'aberta').length
        
        const consertadosHoje = serviceOrdersList.filter(o => 
            (o.status === 'concluida' || o.status === 'faturada') && 
            o.completed_at?.startsWith(today)
        ).length

        // Average cost
        const faturadas = serviceOrdersList.filter(o => o.status === 'faturada')
        const ticketMedio = faturadas.length > 0 
            ? faturadas.reduce((sum, o) => sum + (o.final_cost || o.estimated_cost || 0), 0) / faturadas.length 
            : 0

        return { naBancada, consertadosHoje, aguardandoPecas, novasEntradas, ticketMedio }
    }, [serviceOrdersList])

    // Filter service orders
    const filteredOrders = useMemo(() => {
        return serviceOrdersList.filter(o => {
            const matchesSearch = 
                o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.equipment_description?.toLowerCase().includes(searchQuery.toLowerCase())
            
            const matchesTech = selectedTechFilter === 'all' || o.technician_id === selectedTechFilter
            const isNotCanceled = o.status !== 'cancelada'

            return matchesSearch && matchesTech && isNotCanceled
        })
    }, [serviceOrdersList, searchQuery, selectedTechFilter])

    // Handle Drag & Drop logic
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id)
        setActiveDragId(id)
    }

    const handleDragEnd = () => {
        setActiveDragId(null)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        e.currentTarget.classList.add('bg-white/[0.06]', 'border-primary/20', 'scale-[1.01]', 'shadow-[0_0_20px_rgba(59,130,246,0.05)]')
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.currentTarget.classList.remove('bg-white/[0.06]', 'border-primary/20', 'scale-[1.01]', 'shadow-[0_0_20px_rgba(59,130,246,0.05)]')
    }

    const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault()
        e.currentTarget.classList.remove('bg-white/[0.06]', 'border-primary/20', 'scale-[1.01]', 'shadow-[0_0_20px_rgba(59,130,246,0.05)]')
        const osId = e.dataTransfer.getData('text/plain')
        setActiveDragId(null)

        const os = serviceOrdersList.find(o => o.id === osId)
        if (!os || os.status === targetStatus) return

        // Drop to Faturada requires checkout
        if (targetStatus === 'faturada') {
            if (!hasOpenRegister) {
                toast.error('O terminal de caixa precisa estar aberto para faturar ordens de serviço.')
                return
            }
            setCheckoutOS(os)
            if (paymentMethods.length > 0) {
                setSelectedPaymentMethodId(paymentMethods[0].id)
            }
            return
        }

        // Standard status update
        await updateOSStatus(osId, targetStatus)
    }

    const updateOSStatus = async (osId: string, status: string, paymentMethodId?: string) => {
        const previousList = [...serviceOrdersList]
        
        // Optimistic update
        setServiceOrdersList(prev => prev.map(o => o.id === osId ? { 
            ...o, 
            status, 
            completed_at: status === 'concluida' ? new Date().toISOString() : o.completed_at
        } : o))

        try {
            const res = await fetch(`/api/service-orders/${osId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    payment_method_id: paymentMethodId || null,
                    reason: 'Alterado via painel Kanban'
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao atualizar status da OS')
            }

            toast.success(`OS atualizada para ${status.replace('_', ' ')}`)
            
            // Reload full orders list to get server calculations (like costs or history)
            const listRes = await fetch('/api/service-orders')
            const listData = await listRes.json()
            if (listRes.ok) {
                setServiceOrdersList(listData)
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Falha ao atualizar status')
            setServiceOrdersList(previousList)
        }
    }

    const handleCheckoutSubmit = async () => {
        if (!checkoutOS || !selectedPaymentMethodId) return
        setIsCheckoutLoading(true)
        try {
            await updateOSStatus(checkoutOS.id, 'faturada', selectedPaymentMethodId)
            setCheckoutOS(null)
        } catch (err) {
            console.error(err)
        } finally {
            setIsCheckoutLoading(false)
        }
    }

    const handleSaveDetails = async (updatedFields: any) => {
        if (!selectedOSDetails) return
        setIsSavingDetails(true)
        try {
            const res = await fetch(`/api/service-orders/${selectedOSDetails.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedFields)
            })

            const data = await res.json()
            if (res.ok) {
                toast.success('Alterações salvas com sucesso!')
                setSelectedOSDetails(null)
                // Reload list
                const listRes = await fetch('/api/service-orders')
                const listData = await listRes.json()
                if (listRes.ok) {
                    setServiceOrdersList(listData)
                }
            } else {
                toast.error(data.error || 'Falha ao salvar modificações')
            }
        } catch (error) {
            console.error(error)
            toast.error('Erro de conexão ao salvar')
        } finally {
            setIsSavingDetails(false)
        }
    }

    return (
        <div className="space-y-6 flex flex-col flex-1 min-h-0 min-w-0">
            {/* Real-time Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl glass-premium bg-card/65 border border-white/5 shadow-md flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                        <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Na Bancada</p>
                        <p className="text-xl font-black text-foreground">{stats.naBancada}</p>
                    </div>
                </div>

                <div className="p-4 rounded-2xl glass-premium bg-card/65 border border-white/5 shadow-md flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Consertados Hoje</p>
                        <p className="text-xl font-black text-foreground">{stats.consertadosHoje}</p>
                    </div>
                </div>

                <div className="p-4 rounded-2xl glass-premium bg-card/65 border border-white/5 shadow-md flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                        <PackageOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Sem Peças</p>
                        <p className="text-xl font-black text-foreground">{stats.aguardandoPecas}</p>
                    </div>
                </div>

                <div className="p-4 rounded-2xl glass-premium bg-card/65 border border-white/5 shadow-md flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Novas Entradas</p>
                        <p className="text-xl font-black text-foreground">{stats.novasEntradas}</p>
                    </div>
                </div>

                <div className="col-span-2 md:col-span-1 p-4 rounded-2xl glass-premium bg-card/65 border border-white/5 shadow-md flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Ticket Médio</p>
                        <p className="text-xl font-black text-foreground">{formatCurrency(stats.ticketMedio)}</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <input
                        type="text"
                        placeholder="Buscar por OS, cliente ou aparelho..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-muted/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-muted/40 border border-white/5 rounded-xl px-3 py-1.5 w-full md:w-auto">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground/55" />
                        <select
                            value={selectedTechFilter}
                            onChange={(e) => setSelectedTechFilter(e.target.value)}
                            className="bg-transparent text-xs text-foreground border-none focus:outline-none w-full md:w-auto"
                        >
                            <option value="all">Todos os Técnicos</option>
                            {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Kanban Columns Grid */}
            <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[480px]">
                {COLUMNS.map(col => {
                    const colOrders = filteredOrders.filter(o => o.status === col.id)
                    return (
                        <div
                            key={col.id}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.id)}
                            className="flex-1 min-w-[280px] max-w-[320px] rounded-[1.5rem] bg-card/15 border border-white/[0.03] flex flex-col transition-all duration-300"
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", col.accent)} />
                                    <h3 className="text-xs font-bold text-foreground">{col.title}</h3>
                                </div>
                                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border", col.badge)}>
                                    {colOrders.length}
                                </span>
                            </div>

                            {/* Cards Area */}
                            <div className="flex-1 p-3 overflow-y-auto space-y-3 max-h-[600px] custom-scrollbar">
                                {colOrders.length === 0 ? (
                                    <div className="h-28 border border-dashed border-white/[0.03] rounded-2xl flex flex-col items-center justify-center text-muted-foreground/30">
                                        <PackageOpen className="w-5 h-5 mb-1" />
                                        <span className="text-[9px] uppercase tracking-widest font-black">Coluna Vazia</span>
                                    </div>
                                ) : (
                                    colOrders.map(order => {
                                        const priority = PRIORITY_LABELS[order.priority] || PRIORITY_LABELS.normal
                                        const checklistTotal = order.checklist_progress?.length || 0
                                        const checklistDone = order.checklist_progress?.filter((t: any) => t.completed).length || 0

                                        return (
                                            <div
                                                key={order.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, order.id)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => setSelectedOSDetails(order)}
                                                className={cn(
                                                    "p-4 rounded-2xl bg-card/60 border border-white/5 hover:border-white/10 shadow-sm cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden",
                                                    activeDragId === order.id && "opacity-40 scale-95"
                                                )}
                                            >
                                                {/* Left Accent Color Indicator */}
                                                <div className={cn("absolute left-0 top-0 bottom-0 w-1", 
                                                    order.priority === 'urgente' ? 'bg-rose-500' :
                                                    order.priority === 'alta' ? 'bg-orange-500' :
                                                    order.priority === 'normal' ? 'bg-blue-500' : 'bg-zinc-500'
                                                )} />

                                                <div className="space-y-3 pl-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-[9px] font-black text-primary font-mono tracking-tight">#{order.order_number}</span>
                                                        <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wider", priority.style)}>
                                                            {priority.label}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">{order.title}</h4>
                                                        <p className="text-[9px] text-muted-foreground mt-1 line-clamp-1">{order.customers?.name || 'Sem cliente'}</p>
                                                    </div>

                                                    {/* Device Description */}
                                                    {order.equipment_description && (
                                                        <div className="text-[8px] text-muted-foreground/60 bg-white/[0.02] border border-white/5 rounded px-2 py-1 flex items-center gap-1.5">
                                                            <Wrench className="w-2.5 h-2.5 text-muted-foreground/40" />
                                                            <span className="truncate">{order.equipment_description}</span>
                                                        </div>
                                                    )}

                                                    {/* Progress Checklist & Tech */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                                                        {checklistTotal > 0 ? (
                                                            <div className="flex items-center gap-1 text-[8px] text-muted-foreground font-bold">
                                                                <CheckSquare className="w-3 h-3 text-muted-foreground/40" />
                                                                <span>{checklistDone}/{checklistTotal} tarefas</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[8px] text-muted-foreground/30 font-medium">Sem checklists</span>
                                                        )}

                                                        {/* Tech Tag */}
                                                        {order.technicians ? (
                                                            <div className="flex items-center gap-1 text-[8px] text-foreground/80 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md font-bold">
                                                                <UserCheck className="w-2.5 h-2.5 text-primary" />
                                                                <span>{order.technicians.name.split(' ')[0]}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[8px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 rounded-md">Sem técnico</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Drag to Faturada Checkout Modal */}
            {checkoutOS && (
                <div className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div
                        className="bg-card border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full -mr-32 -mt-32" />

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground">Faturar Ordem de Serviço</h3>
                                <p className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest">Liquidando OS #{checkoutOS.order_number}</p>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-muted/20 border border-white/5 space-y-3 relative z-10">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Equipamento:</span>
                                <span className="font-bold text-foreground">{checkoutOS.equipment_description || 'Geral'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Cliente:</span>
                                <span className="font-bold text-foreground">{checkoutOS.customers?.name || 'Consumidor Final'}</span>
                            </div>
                            <hr className="border-white/5" />
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total a Faturar:</span>
                                <span className="text-2xl font-black text-cyan-400 tabular-nums">{formatCurrency(checkoutOS.final_cost || checkoutOS.estimated_cost || 0)}</span>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="space-y-2 relative z-10">
                            <label className="block text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Método de Liquidação</label>
                            <select
                                value={selectedPaymentMethodId}
                                onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                                className="w-full bg-muted/50 border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                            >
                                {paymentMethods.map(pm => (
                                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-2 relative z-10">
                            <button
                                onClick={() => setCheckoutOS(null)}
                                className="flex-1 py-3 rounded-xl bg-muted/40 text-xs font-bold text-foreground hover:bg-muted/60 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCheckoutSubmit}
                                disabled={isCheckoutLoading}
                                className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
                            >
                                {isCheckoutLoading ? 'Processando...' : (
                                    <>
                                        Faturar OS
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Card Detail Sheet/Drawer */}
            {selectedOSDetails && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
                    {/* Overlay backdrop click */}
                    <div className="absolute inset-0" onClick={() => setSelectedOSDetails(null)} />

                    <div
                        className="bg-card border-l border-white/10 w-full max-w-md h-full relative z-10 p-8 overflow-y-auto flex flex-col space-y-6 shadow-2xl animate-in slide-in-from-right duration-300"
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-white/5">
                            <div>
                                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                    <Wrench className="w-3.5 h-3.5" />
                                    Ficha Rápida de Bancada
                                </div>
                                <h3 className="text-xl font-black text-foreground mt-1">OS #{selectedOSDetails.order_number}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedOSDetails(null)}
                                className="p-2 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Details Content Form */}
                        <div className="flex-1 space-y-5">
                            {/* Title description */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Aparelho / Reparo</label>
                                <input
                                    type="text"
                                    id="detail-title"
                                    defaultValue={selectedOSDetails.title}
                                    className="w-full bg-muted/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Priority Allocation */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Prioridade</label>
                                    <select
                                        id="detail-priority"
                                        defaultValue={selectedOSDetails.priority}
                                        className="w-full bg-muted/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="baixa">Baixa</option>
                                        <option value="normal">Normal</option>
                                        <option value="alta">Alta</option>
                                        <option value="urgente">Urgente</option>
                                    </select>
                                </div>

                                {/* Tech Allocation */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Técnico Atribuído</label>
                                    <select
                                        id="detail-tech"
                                        defaultValue={selectedOSDetails.technician_id || ''}
                                        className="w-full bg-muted/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="">Não Atribuído</option>
                                        {technicians.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Problem Description */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Defeito Reclamado</label>
                                <textarea
                                    id="detail-problem"
                                    rows={3}
                                    defaultValue={selectedOSDetails.problem_description || ''}
                                    className="w-full bg-muted/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>

                            {/* Applied Solution */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Solução Aplicada</label>
                                <textarea
                                    id="detail-solution"
                                    rows={3}
                                    defaultValue={selectedOSDetails.solution_applied || ''}
                                    className="w-full bg-muted/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                    placeholder="Descreva o procedimento executado..."
                                />
                            </div>

                            {/* Quick costs display */}
                            <div className="p-4 rounded-2xl bg-muted/30 border border-white/5 grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <span className="block text-[8px] text-muted-foreground/60 uppercase font-black">Mão de Obra</span>
                                    <span className="text-xs font-bold text-foreground">{formatCurrency(selectedOSDetails.labor_cost || 0)}</span>
                                </div>
                                <div>
                                    <span className="block text-[8px] text-muted-foreground/60 uppercase font-black">Peças</span>
                                    <span className="text-xs font-bold text-foreground">{formatCurrency(selectedOSDetails.parts_cost || 0)}</span>
                                </div>
                                <div>
                                    <span className="block text-[8px] text-primary/80 uppercase font-black">Custo Total</span>
                                    <span className="text-xs font-black text-primary">{formatCurrency(selectedOSDetails.final_cost || selectedOSDetails.estimated_cost || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions bar */}
                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <Link
                                href={`/service-orders/${selectedOSDetails.id}`}
                                className="flex-1 py-3.5 rounded-xl bg-muted/50 border border-white/5 hover:bg-muted text-xs font-bold text-center text-foreground transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <CalendarDays className="w-3.5 h-3.5" />
                                Ver OS Completa
                            </Link>
                            <button
                                onClick={() => {
                                    const title = (document.getElementById('detail-title') as HTMLInputElement)?.value
                                    const priority = (document.getElementById('detail-priority') as HTMLSelectElement)?.value
                                    const technician_id = (document.getElementById('detail-tech') as HTMLSelectElement)?.value || null
                                    const problem_description = (document.getElementById('detail-problem') as HTMLTextAreaElement)?.value
                                    const solution_applied = (document.getElementById('detail-solution') as HTMLTextAreaElement)?.value

                                    handleSaveDetails({ title, priority, technician_id, problem_description, solution_applied })
                                }}
                                disabled={isSavingDetails}
                                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isSavingDetails ? 'Salvando...' : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Salvar Ficha
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
