'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn, getLocalDateTimePickerValue } from '@/lib/utils'
import CustomerAutocomplete from '@/components/ui/CustomerAutocomplete'
import { PremiumInput } from '@/components/ui/PremiumInput'
import PremiumSelect from '@/components/ui/PremiumSelect'
import { PremiumTextarea } from '@/components/ui/PremiumTextarea'
import PremiumAutocomplete from '@/components/ui/PremiumAutocomplete'
import PremiumDateTimePicker from '@/components/ui/PremiumDateTimePicker'
import PremiumModal from '@/components/ui/PremiumModal'
import CustomerForm from '@/components/forms/CustomerForm'
import ItemsManager from '@/components/os/ItemsManager'
import {
    ClipboardList, Wrench, AlertCircle,
    Zap, Clock, Info, Smartphone, Settings,
    Camera, CheckCircle2, XCircle, Loader2,
    Image as ImageIcon, User, ShieldCheck,
    Receipt, FileText, Cpu, CameraIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// No auto-fill suggestions - free text input
// Common device suggestions for the autocomplete
const DEVICE_SUGGESTIONS: string[] = [
    'Notebook',
    'Microcomputador',
    'Smartphone',
    'Tablet',
    'Monitor',
    'Impressora',
    'Projetor',
    'Console de Game',
    'MacBook',
    'iPad',
    'iPhone',
    'Servidor',
    'Nobreak',
    'Switch/Roteador',
    'Pc Gamer',
    'Notebook Acer',
    'Notebook Dell',
    'Notebook HP',
    'Notebook Samsung',
    'Notebook Positivo',
    'Impressora HP',
    'Impressora Epson',
    'Microcomputador Positivo',
    'Microcomputador Dell'
]


interface Customer {
    id: string
    name: string
}
interface Technician {
    id: string
    name: string
}
interface Props {
    customers: Customer[]
    technicians: Technician[]
    inventoryItems: any[]
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

export default function NewOSForm({ 
    customers, 
    technicians, 
    inventoryItems, 
    companyId, 
    initialData, 
    warrantyTerms 
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        customer_id: initialData?.customer_id || '',
        technician_id: initialData?.technician_id || '',
        status: initialData?.status || 'aberta',
        priority: initialData?.priority || 'normal',
        title: initialData?.title || '',
        description: initialData?.description || '',
        problem_description: initialData?.problem_description || '',
        equipment_description: initialData?.equipment_description || '',
        equipment_serial: initialData?.equipment_serial || '',
        parts_cost: initialData?.parts_cost?.toString() || '0',
        labor_cost: initialData?.labor_cost?.toString() || '0',
        estimated_cost: initialData?.estimated_cost?.toString() || '0',
        scheduled_date: initialData?.scheduled_date ? getLocalDateTimePickerValue(new Date(initialData.scheduled_date)) : '',
        internal_notes: initialData?.internal_notes || '',
        warranty_months: initialData?.warranty_months?.toString() || '3',
        device_condition: initialData?.device_condition || '',
        discount_amount: initialData?.discount_amount?.toString() || '0',
        turns_on: initialData?.turns_on ?? true,
        terms_accepted: initialData?.terms_accepted || false,
    })

    const [items, setItems] = useState<any[]>(initialData?.items || [])
    const [localCustomers, setLocalCustomers] = useState(customers)
    const [isQuickMode, setIsQuickMode] = useState(false)
    const [quickService, setQuickService] = useState({ name: '', price: '0', cost: '0' })

    const [photos, setPhotos] = useState<{ front: File | null, back: File | null }>({
        front: null,
        back: null
    })
    const [photoUrls, setPhotoUrls] = useState<{ front: string, back: string }>({
        front: initialData?.photo_front_url || '',
        back: initialData?.photo_back_url || ''
    })
    const [isUploading, setIsUploading] = useState(false)
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
    const [initialCustomerName, setInitialCustomerName] = useState('')

    // Update costs when items change
    useEffect(() => {
        const totalEstimated = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
        const totalPartsCost = items.reduce((sum, item) => sum + (item.inventory_item_id ? (item.total_cost || 0) : 0), 0)
        const totalLaborCost = items.reduce((sum, item) => sum + (!item.inventory_item_id ? (item.total_cost || 0) : 0), 0)

        setForm(p => {
            const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
            const discount = parseFloat(p.discount_amount) || 0
            const totalEstimated = subtotal - discount

            return { 
                ...p, 
                estimated_cost: totalEstimated.toFixed(2),
                parts_cost: totalPartsCost.toFixed(2),
                labor_cost: totalLaborCost.toFixed(2)
            }
        })
    }, [items])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        // Se o título estiver vazio, usar a descrição do equipamento ou um padrão
        if (!form.title.trim()) {
            form.title = form.equipment_description || 'Nova Ordem de Serviço'
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

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    company_id: companyId,
                    parts_cost: parseFloat(form.parts_cost) || 0,
                    labor_cost: parseFloat(form.labor_cost) || 0,
                    estimated_cost: parseFloat(form.estimated_cost) || 0,
                    discount_amount: parseFloat(form.discount_amount) || 0,
                    warranty_months: parseInt(form.warranty_months) || 0,
                    scheduled_date: form.scheduled_date || null,
                    terms_accepted: form.terms_accepted,
                    photo_front_url: finalPhotoFront,
                    photo_back_url: finalPhotoBack,
                    items: items
                }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(isEdit ? 'OS atualizada!' : 'OS aberta com sucesso!')
                router.push(`/service-orders/${data.id || initialData.id}`)
                router.refresh()
            } else {
                toast.error(data.error || 'Erro ao processar OS')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 max-w-[1600px] mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Flutuante com Resumo de Custo */}
            <div className="sticky top-20 z-[400] bg-background/60 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-2xl shadow-black/40">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                        <Zap className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-foreground/80 flex items-center gap-2">
                            {initialData ? 'Edição de OS' : 'Nova Abertura'}
                            {isQuickMode && (
                                <span className="bg-amber-500/10 text-amber-500 text-[8px] px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">MODO RAIO</span>
                            )}
                        </h1>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Preencha os dados com atenção</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Subtotal</span>
                        <span className="text-sm font-bold text-foreground/60 tabular-nums leading-none">
                            R$ {(items.reduce((sum, item) => sum + (item.total_price || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Desconto</span>
                        <span className="text-sm font-bold text-rose-400 tabular-nums leading-none">
                            - R$ {parseFloat(form.discount_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Estimado</span>
                        <span className="text-xl font-black text-emerald-400 tabular-nums leading-none">
                            R$ {parseFloat(form.estimated_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            <XCircle className="w-4 h-4" />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || isUploading}
                            className="px-8 py-3 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {(isPending || isUploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {initialData ? 'Salvar OS' : 'Criar OS'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Coluna Principal (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* CARD 1: IDENTIFICAÇÃO (CHUNKING) */}
                    <div className={cn(
                        "bg-card/40 border rounded-[2rem] p-8 backdrop-blur-xl shadow-inner relative group z-[300] overflow-visible transition-all duration-500",
                        isQuickMode ? "border-amber-500/40 bg-amber-500/[0.03]" : "border-white/5"
                    )}>
                        {isQuickMode && (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.07] to-transparent pointer-events-none rounded-[2rem]" />
                                <div className="absolute -right-8 -top-8 w-48 h-48 text-amber-500/[0.03] pointer-events-none rotate-12">
                                    <Zap className="w-full h-full fill-current" />
                                </div>
                            </>
                        )}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full" />
                        
                        <div className="relative flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-xl transition-all duration-500",
                                    isQuickMode ? "bg-amber-500/20 text-amber-400 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "bg-indigo-500/10 text-indigo-400"
                                )}>
                                    {isQuickMode ? <Zap className="w-5 h-5 fill-current" /> : <User className="w-5 h-5" />}
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground/60">
                                    {isQuickMode ? 'Registro Express (Raio)' : 'Identificação'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsQuickMode(!isQuickMode)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    isQuickMode 
                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                )}
                            >
                                <Zap className={cn("w-3.5 h-3.5", isQuickMode && "fill-current")} />
                                {isQuickMode ? 'Modo Raio Ativo' : 'Ativar Modo Raio'}
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6 relative z-[50]">
                                <div className="relative z-[100]">
                                    <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-[0.2em] italic">Tipo de dispositivo *</label>
                                    <PremiumAutocomplete
                                        value={form.title}
                                        onChange={val => setForm(p => ({ ...p, title: val }))}
                                        placeholder="Ex: iPhone 13 Pro Max"
                                        options={DEVICE_SUGGESTIONS}
                                    />
                                </div>
                                <div className="relative z-[90]">
                                    <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-[0.2em] italic">Cliente proprietário *</label>
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
                                {isQuickMode && (
                                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-4 h-4 text-amber-500 fill-current" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Serviço Rápido</span>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[9px] font-black text-amber-700/60 mb-1 uppercase tracking-widest px-1">O que será feito? (Serviço)</label>
                                                <PremiumInput
                                                    placeholder="Ex: Manutenção preventiva"
                                                    value={quickService.name}
                                                    onChange={(e) => {
                                                        const name = e.target.value;
                                                        setQuickService(prev => ({ ...prev, name }));
                                                        
                                                        const existingIndex = items.findIndex(i => !i.inventory_item_id && i.isQuick);
                                                        if (existingIndex > -1) {
                                                            const newItems = [...items];
                                                            newItems[existingIndex] = { ...newItems[existingIndex], item_name: name };
                                                            setItems(newItems);
                                                        } else if (name) {
                                                            const newItem: any = {
                                                                inventory_item_id: null,
                                                                item_name: name,
                                                                quantity: 1,
                                                                unit_price: Number(quickService.price) || 0,
                                                                unit_cost: Number(quickService.cost) || 0,
                                                                total_price: Number(quickService.price) || 0,
                                                                total_cost: Number(quickService.cost) || 0,
                                                                isQuick: true
                                                            };
                                                            setItems([...items, newItem]);
                                                        }
                                                    }}
                                                    icon={<Wrench className="w-4 h-4" />}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-amber-700/60 mb-1 uppercase tracking-widest px-1">Preço Venda</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500/40">R$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full h-11 bg-white/5 border border-amber-500/20 rounded-xl pl-9 pr-4 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                                            value={quickService.price}
                                                            onChange={(e) => {
                                                                const price = e.target.value;
                                                                setQuickService(prev => ({ ...prev, price }));
                                                                
                                                                const existingIndex = items.findIndex(i => !i.inventory_item_id && i.isQuick);
                                                                if (existingIndex > -1) {
                                                                    const newItems = [...items];
                                                                    newItems[existingIndex] = { 
                                                                        ...newItems[existingIndex], 
                                                                        unit_price: Number(price) || 0, 
                                                                        total_price: Number(price) || 0 
                                                                    };
                                                                    setItems(newItems);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-amber-700/60 mb-1 uppercase tracking-widest px-1">Custo</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500/40">R$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full h-11 bg-white/5 border border-amber-500/20 rounded-xl pl-9 pr-4 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                                            value={quickService.cost}
                                                            onChange={(e) => {
                                                                const cost = e.target.value;
                                                                setQuickService(prev => ({ ...prev, cost }));
                                                                
                                                                const existingIndex = items.findIndex(i => !i.inventory_item_id && i.isQuick);
                                                                if (existingIndex > -1) {
                                                                    const newItems = [...items];
                                                                    newItems[existingIndex] = { 
                                                                        ...newItems[existingIndex], 
                                                                        unit_cost: Number(cost) || 0, 
                                                                        total_cost: Number(cost) || 0 
                                                                    };
                                                                    setItems(newItems);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6 relative z-[10]">
                                <div className="grid grid-cols-1 gap-4">
                                    <PremiumSelect
                                        label="Técnico Responsável"
                                        options={technicians}
                                        selectedId={form.technician_id}
                                        onSelect={(id) => setForm(p => ({ ...p, technician_id: id }))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <PremiumSelect
                                        label="Status Inicial"
                                        options={STATUS_OPTIONS}
                                        selectedId={form.status}
                                        onSelect={(id) => setForm(p => ({ ...p, status: id }))}
                                    />
                                    <PremiumSelect
                                        label="Prioridade"
                                        options={PRIORITY_OPTIONS}
                                        selectedId={form.priority}
                                        onSelect={(id) => setForm(p => ({ ...p, priority: id }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: GESTÃO DE ITENS (O RAIO) */}
                    <div className="bg-card/40 border border-white/5 rounded-[2rem] p-8 backdrop-blur-xl shadow-inner relative group z-[20] overflow-visible">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full" />
                        


                        <ItemsManager 
                            inventoryItems={inventoryItems}
                            onChange={setItems}
                            items={items}
                        />

                        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-end md:items-center justify-end gap-8">
                            <div className="w-full md:w-64 space-y-2">
                                <label className="block text-[10px] font-black text-rose-400/60 uppercase tracking-widest italic px-1">Conceder Desconto (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-rose-400/40 italic">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.discount_amount}
                                        onChange={(e) => {
                                            const disc = e.target.value
                                            setForm(p => {
                                                const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
                                                const discount = parseFloat(disc) || 0
                                                const total = subtotal - discount
                                                return {
                                                    ...p,
                                                    discount_amount: disc,
                                                    estimated_cost: total.toFixed(2)
                                                }
                                            })
                                        }}
                                        className="w-full h-14 bg-rose-500/5 border border-rose-500/10 rounded-2xl pl-12 pr-6 text-sm font-black text-rose-400 placeholder:text-rose-500/20 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all tabular-nums"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Geral</span>
                                <span className="text-4xl font-black text-emerald-400 tabular-nums tracking-tighter">
                                    R$ {parseFloat(form.estimated_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <p className="text-[9px] font-bold text-muted-foreground italic uppercase tracking-widest">Sujeito a alterações conforme laudo técnico</p>
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: DIAGNÓSTICO & NOTAS */}
                    <div className="bg-card/40 border border-white/5 rounded-[2rem] p-8 backdrop-blur-xl shadow-inner relative overflow-visible group z-[30]">
                        <div className="relative flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-foreground/60">Relato do Problema & Diagnóstico</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-muted-foreground tracking-widest italic">Sintomas relatados pelo cliente</label>
                                <PremiumTextarea
                                    value={form.problem_description}
                                    onChange={e => setForm(p => ({ ...p, problem_description: e.target.value }))}
                                    placeholder="Descreva aqui o que o cliente disse..."
                                    rows={4}
                                    className="bg-white/5 border-white/5 focus:border-indigo-500/30 p-6"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-muted-foreground tracking-widest italic">Laudo Técnico / Observações</label>
                                <PremiumTextarea
                                    value={form.description}
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Descreva aqui sua avaliação técnica..."
                                    rows={4}
                                    className="bg-white/5 border-white/5 focus:border-indigo-500/30 p-6"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Lateral (4 cols) */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* CARD 4: DETALHES DO APARELHO */}
                    <div className="bg-card/40 border border-white/5 rounded-[2rem] p-8 backdrop-blur-xl shadow-inner">
                        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-foreground/60">O Dispositivo</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-widest">Modelo / Especificação</label>
                                    <PremiumAutocomplete
                                        value={form.equipment_description}
                                        onChange={val => setForm(p => ({ ...p, equipment_description: val }))}
                                        placeholder="Ex: iPhone 14 Pro Max..."
                                        options={DEVICE_SUGGESTIONS}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-widest">Serial / IMEI</label>
                                    <PremiumInput
                                        value={form.equipment_serial}
                                        onChange={e => setForm(p => ({ ...p, equipment_serial: e.target.value }))}
                                        placeholder="Nº de Série..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-muted-foreground tracking-widest">Aparelho liga?</span>
                                <button
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, turns_on: !p.turns_on }))}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${form.turns_on
                                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                                        : 'bg-rose-500/20 text-rose-500 border border-rose-500/20'
                                        }`}
                                >
                                    {form.turns_on ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {form.turns_on ? 'Sim' : 'Não'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-muted-foreground tracking-widest">Estado físico</label>
                                <PremiumTextarea
                                    value={form.device_condition}
                                    onChange={e => setForm(p => ({ ...p, device_condition: e.target.value }))}
                                    placeholder="Ex: Riscos na tela, batida no canto..."
                                    rows={3}
                                    className="bg-white/5 border-white/5 text-xs p-4"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Foto Frontal</span>
                                    <div className="relative group/photo aspect-video rounded-xl border border-white/5 bg-white/5 overflow-hidden">
                                        <input
                                            type="file" accept="image/*" capture="environment"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                            onChange={e => setPhotos(p => ({ ...p, front: e.target.files?.[0] || null }))}
                                        />
                                        {photos.front ? (
                                            <img src={URL.createObjectURL(photos.front)} className="w-full h-full object-cover" />
                                        ) : photoUrls.front ? (
                                            <img src={photoUrls.front} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30">
                                                <CameraIcon className="w-6 h-6 mb-1" />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Anexar</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Foto Traseira</span>
                                    <div className="relative group/photo aspect-video rounded-xl border border-white/5 bg-white/5 overflow-hidden">
                                        <input
                                            type="file" accept="image/*" capture="environment"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                            onChange={e => setPhotos(p => ({ ...p, back: e.target.files?.[0] || null }))}
                                        />
                                        {photos.back ? (
                                            <img src={URL.createObjectURL(photos.back)} className="w-full h-full object-cover" />
                                        ) : photoUrls.back ? (
                                            <img src={photoUrls.back} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30">
                                                <CameraIcon className="w-6 h-6 mb-1" />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Anexar</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CARD 5: AGENDAMENTO & GARANTIA */}
                    <div className="bg-card/40 border border-white/5 rounded-[2rem] p-8 backdrop-blur-xl shadow-inner">
                        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-foreground/60">Prazos & Garantia</h2>
                        </div>

                        <div className="space-y-6">
                            <PremiumDateTimePicker
                                label="Data de Entrega / Agendamento"
                                value={form.scheduled_date}
                                onChange={(val: string) => setForm(p => ({ ...p, scheduled_date: val }))}
                            />

                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest italic">Meses de Garantia</label>
                                <PremiumInput
                                    type="number"
                                    value={form.warranty_months}
                                    onChange={e => setForm(p => ({ ...p, warranty_months: e.target.value }))}
                                />
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 mt-1">
                                        <ShieldCheck className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-medium text-muted-foreground leading-relaxed uppercase tracking-widest">
                                            O cliente aceita os termos de serviço e política de garantia do Nexus.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, terms_accepted: !p.terms_accepted }))}
                                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.terms_accepted 
                                        ? 'bg-indigo-500 text-white' 
                                        : 'bg-white/5 text-muted-foreground border border-white/5'}`}
                                >
                                    {form.terms_accepted ? 'Termos Aceitos' : 'Aceitar Termos'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para Novo Cliente */}
            <PremiumModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                title="Novo Cliente"
                maxWidth="lg"
            >
                <div className="p-2">
                    <CustomerForm 
                        companyId={companyId}
                        initial={{ name: initialCustomerName }}
                        hideHeader
                        onSuccess={(customer) => {
                            if (customer && customer.id) {
                                setLocalCustomers(p => {
                                    if (p.some(c => c.id === customer.id)) return p
                                    return [...p, customer]
                                })
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
