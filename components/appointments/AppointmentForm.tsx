'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, TextArea, TextInput } from '@/components/ui/form'
import OptionPicker from '@/components/ui/OptionPicker'

interface AppointmentFormProps {
    onClose: () => void
    onSuccess?: () => void
    customers: { id: string; name: string }[]
    technicians: { id: string; name: string }[]
    serviceOrders: { id: string; order_number?: number | string; title?: string }[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appointment?: any // Prop for editing
    initialDate?: Date | null // Prop for pre-filling date
}

const STATUS: { value: string; label: string }[] = [
    { value: 'scheduled', label: 'Agendado' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'in_progress', label: 'Em andamento' },
    { value: 'completed', label: 'Concluído' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function initialWhen(appointment?: { scheduled_date?: string }, initialDate?: Date | null) {
    const now = new Date()
    if (appointment?.scheduled_date) {
        const dt = new Date(appointment.scheduled_date)
        return { date: localDate(dt), time: localTime(dt) }
    }
    return { date: localDate(initialDate ?? now), time: localTime(now) }
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
    const [status, setStatus] = useState<string>(appointment?.status || 'scheduled')
    const [customerId, setCustomerId] = useState(appointment?.customer_id || '')
    const [technicianId, setTechnicianId] = useState(appointment?.technician_id || '')
    const [serviceOrderId, setServiceOrderId] = useState(appointment?.service_order_id || '')
    const [notes, setNotes] = useState(appointment?.notes || '')
    const [when] = useState(() => initialWhen(appointment, initialDate))
    const [date, setDate] = useState(when.date)
    const [time, setTime] = useState(when.time)
    const [customers, setCustomers] = useState(initialCustomers)
    const [invalid, setInvalid] = useState(false)

    const createCustomer = async (name: string) => {
        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, is_active: true })
            })
            if (!res.ok) throw new Error()
            const created = await res.json()
            setCustomers(prev => [...prev, { id: created.id, name: created.name ?? name }])
            toast.success('Cliente cadastrado')
            return created.id as string
        } catch {
            toast.error('Não foi possível cadastrar o cliente. Tente de novo.')
            return null
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customerId || !technicianId) {
            setInvalid(true)
            toast.error(!customerId ? 'Escolha o cliente' : 'Escolha o técnico')
            return
        }
        setLoading(true)
        const payload = {
            id: appointment?.id,
            customer_id: customerId,
            technician_id: technicianId,
            service_order_id: serviceOrderId || null,
            scheduled_date: new Date(`${date}T${time}`).toISOString(),
            status,
            notes
        }

        try {
            const res = await fetch('/api/appointments', {
                method: appointment ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error()
            toast.success(appointment ? 'Agendamento atualizado' : 'Agendamento criado')
            onSuccess?.()
            onClose()
        } catch {
            toast.error('Não foi possível salvar o agendamento. Confira a conexão e tente de novo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Group>
                <OptionPicker
                    label="Cliente"
                    options={customers}
                    value={customerId}
                    onChange={id => { setCustomerId(id); setInvalid(false) }}
                    searchPlaceholder="Buscar cliente"
                    emptyText="Nenhum cliente cadastrado ainda."
                    onCreate={createCustomer}
                    invalid={invalid && !customerId}
                />
                <OptionPicker
                    label="Técnico"
                    options={technicians}
                    value={technicianId}
                    onChange={id => { setTechnicianId(id); setInvalid(false) }}
                    searchPlaceholder="Buscar técnico"
                    emptyText="Nenhum técnico cadastrado ainda."
                    invalid={invalid && !technicianId}
                />
            </Group>

            <Group>
                <div className="grid grid-cols-2 divide-x divide-border/60">
                    <Field label="Data" htmlFor="ap-date"><TextInput id="ap-date" type="date" required value={date} onChange={e => setDate(e.target.value)} /></Field>
                    <Field label="Hora" htmlFor="ap-time"><TextInput id="ap-time" type="time" required value={time} onChange={e => setTime(e.target.value)} /></Field>
                </div>
            </Group>

            <Group title="Situação">
                <div className="p-3">
                    <Chips ariaLabel="Situação" options={STATUS} value={status} onChange={setStatus} />
                </div>
            </Group>

            <Group>
                <OptionPicker
                    label="Ordem de serviço"
                    title="Vincular OS"
                    options={serviceOrders.map(o => ({ id: o.id, name: `#${o.order_number ?? ''} ${o.title ?? ''}`.trim() }))}
                    value={serviceOrderId}
                    onChange={setServiceOrderId}
                    placeholder="Nenhuma"
                    searchPlaceholder="Número ou título da OS"
                    emptyText="Nenhuma OS aberta."
                    optional
                />
                <Field label="Observações" htmlFor="ap-notes">
                    <TextArea id="ap-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instruções para o técnico…" />
                </Field>
            </Group>

            <div className="flex gap-2">
                <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
                <PrimaryButton type="submit" className="flex-1" disabled={loading}>
                    {loading && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />}
                    {appointment ? 'Salvar alterações' : 'Agendar'}
                </PrimaryButton>
            </div>
        </form>
    )
}
