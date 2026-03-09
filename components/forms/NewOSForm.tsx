'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { toast } from 'sonner'
import CustomerAutocomplete from '@/components/ui/CustomerAutocomplete'
import { PremiumInput } from '@/components/ui/PremiumInput'
import PremiumSelect from '@/components/ui/PremiumSelect'
import { PremiumTextarea } from '@/components/ui/PremiumTextarea'
import PremiumAutocomplete from '@/components/ui/PremiumAutocomplete'
import PremiumDateTimePicker from '@/components/ui/PremiumDateTimePicker'
import {
    ClipboardList, Wrench, Layers, AlertCircle,
    Zap, Clock, DollarSign, Calendar, Info, Smartphone, Tablet, Laptop, Settings
} from 'lucide-react'

// Common device models for autocomplete
const DEVICE_SUGGESTIONS = [
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone 14', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'Samsung Galaxy S21', 'Samsung Galaxy S22', 'Samsung Galaxy S23', 'Samsung Galaxy S24',
    'iPad Pro', 'iPad Air', 'MacBook Pro', 'MacBook Air',
    'Xiaomi Redmi Note 12', 'Xiaomi Poco X5',
    'Motorola Moto G54', 'Motorola Edge 40'
]

// Common service categories for electronics
const SERVICE_SUGGESTIONS = [
    'Troca de Tela / Display',
    'Troca de Bateria',
    'Reparo em Placa Mãe (Micro-soldagem)',
    'Recondicionamento de Tela (Troca de Vidro)',
    'Reparo de Conector de Carga',
    'Desoxidação (Limpeza Química)',
    'Atualização / Restauração de Software',
    'Câmera Frontal / Traseira',
    'Alto-falante / Microfone',
    'Recuperação de Dados'
]

interface Customer {
    id: string
    name: string
}
interface Technician {
    id: string
    name: string
}
interface ServiceType {
    id: string
    name: string
}

interface Props {
    customers: Customer[]
    technicians: Technician[]
    serviceTypes: ServiceType[]
    companyId: string
    initialData?: any
    warrantyTerms?: string
}

const STATUS_OPTIONS = [
    { id: 'aberta', name: 'Aberta' },
    { id: 'agendada', name: 'Agendada' },
    { id: 'em_andamento', name: 'Em Andamento' },
    { id: 'concluida', name: 'Concluída' },
]

const PRIORITY_OPTIONS = [
    { id: 'baixa', name: 'Baixa' },
    { id: 'normal', name: 'Normal' },
    { id: 'alta', name: 'Alta' },
    { id: 'urgente', name: 'Urgente' },
]

export default function NewOSForm({ customers, technicians, serviceTypes, companyId, initialData, warrantyTerms }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        customer_id: initialData?.customer_id || '',
        technician_id: initialData?.technician_id || '',
        service_type_id: initialData?.service_type_id || '',
        status: initialData?.status || 'aberta',
        priority: initialData?.priority || 'normal',
        title: initialData?.title || '',
        description: initialData?.description || '',
        problem_description: initialData?.problem_description || '',
        equipment_description: initialData?.equipment_description || '',
        equipment_serial: initialData?.equipment_serial || '',
        parts_cost: initialData?.parts_cost?.toString() || '',
        labor_cost: initialData?.labor_cost?.toString() || '',
        estimated_cost: initialData?.estimated_cost?.toString() || '',
        scheduled_date: initialData?.scheduled_date ? new Date(initialData.scheduled_date).toISOString().slice(0, 16) : '',
        internal_notes: initialData?.internal_notes || '',
        warranty_months: initialData?.warranty_months?.toString() || '3',
        terms_accepted: initialData?.terms_accepted || false,
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.title.trim()) {
            toast.error('O título é obrigatório')
            return
        }
        if (!form.customer_id) {
            toast.error('Selecione um cliente')
            return
        }

        startTransition(async () => {
            const isEdit = !!initialData?.id
            const url = isEdit ? `/api/service-orders/${initialData.id}` : '/api/service-orders'
            const method = isEdit ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    company_id: companyId,
                    parts_cost: form.parts_cost ? parseFloat(form.parts_cost) : 0,
                    labor_cost: form.labor_cost ? parseFloat(form.labor_cost) : 0,
                    estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : 0,
                    warranty_months: parseInt(form.warranty_months) || 0,
                    scheduled_date: form.scheduled_date || null,
                    terms_accepted: form.terms_accepted,
                }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(isEdit ? 'Ordem de serviço atualizada!' : 'Ordem de serviço aberta com sucesso!')
                router.push(`/service-orders/${data.id || initialData.id}`)
                router.refresh()
            } else {
                toast.error(data.error || 'Erro ao processar OS')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 max-w-[1400px] mx-auto space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left column: OS Info */}
                <div className="space-y-4 bg-card/40 border border-border p-5 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <ClipboardList className="w-4 h-4" />
                        </div>
                        <h2 className="text-[11px] font-black text-foreground/40 uppercase tracking-[0.2em]">Serviço</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">TÍTULO *</label>
                                <PremiumAutocomplete
                                    value={form.title}
                                    onChange={val => setForm(p => ({ ...p, title: val }))}
                                    placeholder="Ex: Troca de Tela"
                                    options={SERVICE_SUGGESTIONS}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">CLIENTE *</label>
                                <CustomerAutocomplete
                                    customers={customers}
                                    selectedId={form.customer_id}
                                    onSelect={(id) => setForm(p => ({ ...p, customer_id: id }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <PremiumSelect
                                label="TÉCNICO"
                                options={technicians}
                                selectedId={form.technician_id}
                                onSelect={(id) => setForm(p => ({ ...p, technician_id: id }))}
                            />
                            <PremiumSelect
                                label="LAB"
                                options={serviceTypes}
                                selectedId={form.service_type_id}
                                onSelect={(id) => setForm(p => ({ ...p, service_type_id: id }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <PremiumSelect
                                label="ESTADO"
                                options={STATUS_OPTIONS}
                                selectedId={form.status}
                                onSelect={(id) => setForm(p => ({ ...p, status: id }))}
                            />
                            <PremiumSelect
                                label="URGÊNCIA"
                                options={PRIORITY_OPTIONS}
                                selectedId={form.priority}
                                onSelect={(id) => setForm(p => ({ ...p, priority: id }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Right column: Device & Time */}
                <div className="space-y-4 bg-card/40 border border-border p-5 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                        <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                            <Wrench className="w-4 h-4" />
                        </div>
                        <h2 className="text-[11px] font-black text-foreground/40 uppercase tracking-[0.2em]">Aparelho</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">MODELO</label>
                                <PremiumAutocomplete
                                    value={form.equipment_description}
                                    onChange={val => setForm(p => ({ ...p, equipment_description: val }))}
                                    placeholder="iPhone 14..."
                                    options={DEVICE_SUGGESTIONS}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">SERIAL/IMEI</label>
                                <PremiumInput
                                    value={form.equipment_serial}
                                    onChange={e => setForm(p => ({ ...p, equipment_serial: e.target.value }))}
                                    placeholder="..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">CUSTOS (R$)</label>
                                <PremiumInput
                                    type="number"
                                    step="0.01"
                                    value={form.parts_cost}
                                    onChange={e => setForm(p => ({ ...p, parts_cost: e.target.value }))}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-rose-400 mb-2 uppercase tracking-[0.2em]">VALOR TOTAL (R$)</label>
                                <PremiumInput
                                    type="number"
                                    step="0.01"
                                    value={form.estimated_cost}
                                    onChange={e => setForm(p => ({ ...p, estimated_cost: e.target.value }))}
                                    placeholder="0.00"
                                    className="border-rose-500/20 focus:border-rose-500/40"
                                />
                            </div>
                        </div>

                        <PremiumDateTimePicker
                            label="ENTRADA / AGENDAMENTO"
                            value={form.scheduled_date}
                            onChange={(val: string) => setForm(p => ({ ...p, scheduled_date: val }))}
                        />
                    </div>
                </div>
            </div>

            {/* Warranty Terms Acceptance Section */}
            {warrantyTerms && (
                <div className="bg-card/40 border border-border p-5 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Info className="w-4 h-4" />
                        </div>
                        <h2 className="text-[11px] font-black text-foreground/40 uppercase tracking-[0.2em]">Termos de Garantia / Contrato</h2>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar">
                        <p className="text-[11px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap">
                            {warrantyTerms}
                        </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group p-2">
                        <input
                            type="checkbox"
                            checked={form.terms_accepted}
                            onChange={e => setForm(p => ({ ...p, terms_accepted: e.target.checked }))}
                            className="hidden"
                        />
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${form.terms_accepted ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-border bg-muted/20 hover:border-emerald-500/50'}`}>
                            {form.terms_accepted && <Zap className="w-3 h-3 text-white fill-current" />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${form.terms_accepted ? 'text-emerald-500' : 'text-muted-foreground/40 group-hover:text-muted-foreground/60'}`}>
                            O cliente está ciente e concorda com os termos acima
                        </span>
                    </label>
                </div>
            )}

            {/* Bottom: Notes & Diagnosis */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 bg-card/40 border border-border p-5 rounded-3xl shadow-sm">
                <div>
                    <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">SINTOMAS</label>
                    <PremiumTextarea
                        value={form.problem_description}
                        onChange={e => setForm(p => ({ ...p, problem_description: e.target.value }))}
                        className="h-20"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">LAUDO INICIAL</label>
                    <PremiumTextarea
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        className="h-20"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">NOTAS INTERNAS</label>
                    <PremiumTextarea
                        value={form.internal_notes}
                        onChange={e => setForm(p => ({ ...p, internal_notes: e.target.value }))}
                        className="h-20 border-amber-500/20 focus:border-amber-500/40"
                    />
                </div>
            </div>

            {/* Float-like Compact Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 py-4 border-t border-border">
                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full sm:w-auto flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                    {isPending ? 'PROCESSANDO...' : (initialData?.id ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR ENTRADA')}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl border border-border bg-card text-foreground/40 font-bold text-[10px] uppercase tracking-widest hover:bg-muted hover:text-foreground transition-all"
                >
                    ABORTAR
                </button>
            </div>
        </form>
    )
}
