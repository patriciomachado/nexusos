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
import PremiumModal from '@/components/ui/PremiumModal'
import CustomerForm from '@/components/forms/CustomerForm'
import {
    ClipboardList, Wrench, AlertCircle,
    Zap, Clock, Info, Smartphone, Settings,
    Camera, CheckCircle2, XCircle, Loader2,
    Image as ImageIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
        device_condition: initialData?.device_condition || '',
        turns_on: initialData?.turns_on ?? true,
        terms_accepted: initialData?.terms_accepted || false,
    })

    const [localCustomers, setLocalCustomers] = useState(customers)
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
    const [initialCustomerName, setInitialCustomerName] = useState('')

    const [photos, setPhotos] = useState<{ front: File | null, back: File | null }>({
        front: null,
        back: null
    })
    const [photoUrls, setPhotoUrls] = useState<{ front: string, back: string }>({
        front: initialData?.photo_front_url || '',
        back: initialData?.photo_back_url || ''
    })
    const [isUploading, setIsUploading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.title.trim()) {
            toast.error('O dispositivo é obrigatório')
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

            let finalPhotoFront = photoUrls.front
            let finalPhotoBack = photoUrls.back

            // 1. Upload photos if present
            if (photos.front || photos.back) {
                setIsUploading(true)
                try {
                    if (photos.front) {
                        const fileExt = photos.front.name.split('.').pop()
                        const fileName = `${companyId}/${Date.now()}-front.${fileExt}`
                        const { data, error } = await supabase.storage
                            .from('os-photos')
                            .upload(fileName, photos.front)

                        if (error) throw error
                        const { data: { publicUrl } } = supabase.storage.from('os-photos').getPublicUrl(data.path)
                        finalPhotoFront = publicUrl
                    }

                    if (photos.back) {
                        const fileExt = photos.back.name.split('.').pop()
                        const fileName = `${companyId}/${Date.now()}-back.${fileExt}`
                        const { data, error } = await supabase.storage
                            .from('os-photos')
                            .upload(fileName, photos.back)

                        if (error) throw error
                        const { data: { publicUrl } } = supabase.storage.from('os-photos').getPublicUrl(data.path)
                        finalPhotoBack = publicUrl
                    }
                } catch (err: any) {
                    toast.error('Erro no upload de fotos: ' + err.message)
                    setIsUploading(false)
                    return
                }
                setIsUploading(false)
            }

            // 2. Submit OS
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
                    photo_front_url: finalPhotoFront,
                    photo_back_url: finalPhotoBack,
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
                                <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">DISPOSITIVO *</label>
                                <PremiumAutocomplete
                                    value={form.title}
                                    onChange={val => setForm(p => ({ ...p, title: val }))}
                                    placeholder="Ex: iPhone 13..."
                                    options={SERVICE_SUGGESTIONS}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">CLIENTE *</label>
                                <CustomerAutocomplete
                                    customers={localCustomers}
                                    selectedId={form.customer_id}
                                    onSelect={(id) => setForm(p => ({ ...p, customer_id: id }))}
                                    onAdd={(name) => {
                                        setInitialCustomerName(name)
                                        setIsCustomerModalOpen(true)
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <PremiumSelect
                                label="TÉCNICO"
                                options={technicians}
                                selectedId={form.technician_id}
                                onSelect={(id) => setForm(p => ({ ...p, technician_id: id }))}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <PremiumSelect
                                label="ESTADO"
                                options={STATUS_OPTIONS}
                                selectedId={form.status}
                                onSelect={(id) => setForm(p => ({ ...p, status: id }))}
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

            {/* Device Check-in Section */}
            <div className="bg-card/40 border border-border/50 rounded-[2.5rem] p-6 backdrop-blur-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 blur-[120px] rounded-full transition-all group-hover:bg-rose-500/10" />

                <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-muted-foreground tracking-tight uppercase tracking-widest">Check-in do Aparelho</h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">O aparelho liga?</span>
                            <button
                                type="button"
                                onClick={() => setForm(p => ({ ...p, turns_on: !p.turns_on }))}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${form.turns_on
                                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-rose-500/20 text-rose-500 border border-rose-500/20'
                                    }`}
                            >
                                {form.turns_on ? (
                                    <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        Sim, Liga
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-3 h-3" />
                                        Não Liga
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest italic">Estado Físico / Avaliação Visual</label>
                            <PremiumTextarea
                                name="device_condition"
                                value={form.device_condition}
                                onChange={e => setForm(p => ({ ...p, device_condition: e.target.value }))}
                                placeholder="Ex: Tela riscada, tampa traseira trincada, marcas de uso nas bordas..."
                                rows={4}
                                className="bg-white/5 border-white/5 focus:border-rose-500/30 text-sm p-6"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest italic">Fotos do Recebimento</label>
                            <div className="grid grid-cols-2 gap-4 h-full">
                                {/* Front Photo */}
                                <div className="relative group/photo h-full">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                        onChange={e => setPhotos(p => ({ ...p, front: e.target.files?.[0] || null }))}
                                    />
                                    <div className="h-40 rounded-2xl border-2 border-dashed border-border/50 bg-white/5 flex flex-col items-center justify-center gap-2 group-hover/photo:border-rose-500/30 transition-all overflow-hidden relative">
                                        {photos.front ? (
                                            <img src={URL.createObjectURL(photos.front)} className="w-full h-full object-cover" />
                                        ) : photoUrls.front ? (
                                            <img src={photoUrls.front} className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <Camera className="w-6 h-6 text-muted-foreground/30" />
                                                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">Frontal</span>
                                            </>
                                        )}
                                        {(photos.front || photoUrls.front) && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Alterar Foto</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Back Photo */}
                                <div className="relative group/photo h-full">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                        onChange={e => setPhotos(p => ({ ...p, back: e.target.files?.[0] || null }))}
                                    />
                                    <div className="h-40 rounded-2xl border-2 border-dashed border-border/50 bg-white/5 flex flex-col items-center justify-center gap-2 group-hover/photo:border-rose-500/30 transition-all overflow-hidden relative">
                                        {photos.back ? (
                                            <img src={URL.createObjectURL(photos.back)} className="w-full h-full object-cover" />
                                        ) : photoUrls.back ? (
                                            <img src={photoUrls.back} className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <Camera className="w-6 h-6 text-muted-foreground/30" />
                                                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">Traseira</span>
                                            </>
                                        )}
                                        {(photos.back || photoUrls.back) && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Alterar Foto</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


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
            <div className="flex flex-col sm:flex-row items-center gap-4 py-6 border-t border-border">
                <button
                    type="submit"
                    disabled={isPending || isUploading}
                    className="w-full sm:flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-50 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                >
                    {(isPending || isUploading) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : <CheckCircle2 className="w-4 h-4" />}
                    {(isPending || isUploading) ? 'PROCESSANDO...' : (initialData ? 'SALVAR ALTERAÇÕES' : 'ABRIR ORDEM DE SERVIÇO')}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto px-10 py-4 rounded-xl border border-border bg-card text-foreground/40 font-black text-[10px] uppercase tracking-widest hover:bg-muted hover:text-foreground transition-all flex items-center justify-center gap-2"
                >
                    <XCircle className="w-4 h-4" />
                    ABORTAR
                </button>
            </div>

            {/* Modal para Novo Cliente */}
            <PremiumModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                title="Novo Cliente"
                maxWidth="lg"
            >
                <div className="p-4">
                    <CustomerForm 
                        companyId={companyId}
                        initial={{ name: initialCustomerName }}
                        hideHeader
                        onSuccess={(customer) => {
                            if (customer.id) {
                                setLocalCustomers(p => [...p, customer])
                                setForm(p => ({ ...p, customer_id: customer.id }))
                            }
                            setIsCustomerModalOpen(false)
                        }}
                    />
                </div>
            </PremiumModal>
        </form>
    )
}
