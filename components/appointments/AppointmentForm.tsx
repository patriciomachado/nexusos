'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, User, ClipboardList, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PremiumInput } from '@/components/ui/PremiumInput'
import PremiumSelect from '@/components/ui/PremiumSelect'
import CustomerAutocomplete from '@/components/ui/CustomerAutocomplete'
import TechnicianAutocomplete from '@/components/ui/TechnicianAutocomplete'
import ServiceOrderAutocomplete from '@/components/ui/ServiceOrderAutocomplete'
import { toast } from 'sonner'

interface AppointmentFormProps {
    onClose: () => void
    onSuccess?: () => void
    customers: any[]
    technicians: any[]
    serviceOrders: any[]
    appointment?: any // Prop for editing
    initialDate?: Date | null // Prop for pre-filling date
}

export default function AppointmentForm({
    onClose,
    onSuccess,
    customers: initialCustomers,
    technicians,
    serviceOrders,
    appointment,
    initialDate
}: AppointmentFormProps) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState(appointment?.status || 'scheduled')
    const [customerId, setCustomerId] = useState(appointment?.customer_id || '')
    const [technicianId, setTechnicianId] = useState(appointment?.technician_id || '')
    const [serviceOrderId, setServiceOrderId] = useState(appointment?.service_order_id || '')
    const [notes, setNotes] = useState(appointment?.notes || '')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [customers, setCustomers] = useState(initialCustomers)
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

    useEffect(() => {
        if (appointment) {
            const dt = new Date(appointment.scheduled_date)
            setDate(dt.toISOString().split('T')[0])
            setTime(dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        } else if (initialDate) {
            setDate(initialDate.toISOString().split('T')[0])
            setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        } else {
            const now = new Date()
            setDate(now.toISOString().split('T')[0])
            setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        }
    }, [appointment, initialDate])

    const handleCreateCustomer = async (name: string) => {
        setIsCreatingCustomer(true)
        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, is_active: true })
            })
            if (!res.ok) throw new Error('Falha ao criar cliente')
            const newCustomer = await res.json()
            setCustomers(prev => [...prev, newCustomer])
            setCustomerId(newCustomer.id)
            toast.success('Cliente criado com sucesso!')
        } catch (error) {
            toast.error('Erro ao criar cliente')
        } finally {
            setIsCreatingCustomer(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customerId) {
            toast.error('Selecione um cliente')
            return
        }
        setLoading(true)

        // Combine date and time
        const scheduled_date = new Date(`${date}T${time}`).toISOString()

        const payload = {
            id: appointment?.id,
            customer_id: customerId,
            technician_id: technicianId || null,
            service_order_id: serviceOrderId || null,
            scheduled_date,
            status,
            notes
        }

        try {
            const res = await fetch('/api/appointments', {
                method: appointment ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Erro ao salvar agendamento')

            toast.success(appointment ? 'Agendamento atualizado!' : 'Agendamento criado!')
            onSuccess?.()
            onClose()
        } catch (error) {
            toast.error('Erro ao salvar agendamento')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" suppressHydrationWarning>
                <div className="space-y-4" suppressHydrationWarning>
                    <div className="flex items-center gap-2 mb-2" suppressHydrationWarning>
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Informações do Cliente</h3>
                    </div>

                    <CustomerAutocomplete
                        customers={customers}
                        selectedId={customerId}
                        onSelect={setCustomerId}
                        onAdd={handleCreateCustomer}
                        isAdding={isCreatingCustomer}
                        placeholder="Pesquisar cliente..."
                        label="Cliente"
                    />

                    <TechnicianAutocomplete
                        technicians={technicians}
                        selectedId={technicianId}
                        onSelect={setTechnicianId}
                        label="Técnico Responsável"
                        placeholder="Pesquisar técnico..."
                    />
                </div>

                <div className="space-y-4" suppressHydrationWarning>
                    <div className="flex items-center gap-2 mb-2" suppressHydrationWarning>
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Data e Horário</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4" suppressHydrationWarning>
                        <PremiumInput
                            type="date"
                            label="Data"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <PremiumInput
                            type="time"
                            label="Hora"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                    <PremiumSelect
                        label="Status Inicial"
                        selectedId={status}
                        onSelect={setStatus}
                        options={[
                            { id: 'scheduled', name: 'Agendado' },
                            { id: 'confirmed', name: 'Confirmado' },
                            { id: 'in_progress', name: 'Em Andamento' },
                            { id: 'completed', name: 'Concluído' }
                        ]}
                    />
                </div>
            </div>

            <div className="space-y-4" suppressHydrationWarning>
                <div className="flex items-center gap-2 mb-2" suppressHydrationWarning>
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Detalhes do Serviço</h3>
                </div>

                <ServiceOrderAutocomplete
                    serviceOrders={serviceOrders}
                    selectedId={serviceOrderId}
                    onSelect={setServiceOrderId}
                    label="Vincular Ordem de Serviço (Opcional)"
                    placeholder="Número ou título da OS..."
                />

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2" suppressHydrationWarning>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40" suppressHydrationWarning>Observações</label>
                    <textarea
                        className="w-full bg-transparent border-none outline-none text-sm min-h-[100px] resize-none text-foreground placeholder-white/10"
                        placeholder="Instruções adicionais para o técnico..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        suppressHydrationWarning
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-white/5" suppressHydrationWarning>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading || isCreatingCustomer}
                    className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : appointment ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
            </div>
        </form>
    )
}
