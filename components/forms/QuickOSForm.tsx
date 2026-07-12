'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import CustomerAutocomplete from '@/components/ui/CustomerAutocomplete'
import PremiumAutocomplete from '@/components/ui/PremiumAutocomplete'
import { PremiumTextarea } from '@/components/ui/PremiumTextarea'
import PremiumModal from '@/components/ui/PremiumModal'
import CustomerForm from '@/components/forms/CustomerForm'
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react'

const DEVICE_SUGGESTIONS: string[] = [
    'Notebook', 'Microcomputador', 'Smartphone', 'Tablet', 'Monitor',
    'Impressora', 'Projetor', 'Console de Game', 'MacBook', 'iPad',
    'iPhone', 'Servidor', 'Nobreak', 'Switch/Roteador', 'Pc Gamer',
    'Notebook Acer', 'Notebook Dell', 'Notebook HP', 'Notebook Samsung',
    'Notebook Positivo', 'Impressora HP', 'Impressora Epson',
    'Microcomputador Positivo', 'Microcomputador Dell'
]

interface Customer { id: string; name: string }
interface Technician { id: string; name: string }

interface Props {
    customers: Customer[]
    technicians: Technician[]
    companyId: string
}

export default function QuickOSForm({ customers, technicians, companyId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [localCustomers, setLocalCustomers] = useState(customers)
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
    const [initialCustomerName, setInitialCustomerName] = useState('')

    const [form, setForm] = useState({
        customer_id: '',
        title: '',
        equipment_description: '',
        problem_description: '',
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!form.customer_id) {
            toast.error('Selecione um cliente')
            return
        }
        if (!form.title.trim()) {
            toast.error('Informe o tipo de dispositivo')
            return
        }

        startTransition(async () => {
            const res = await fetch('/api/service-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: form.customer_id,
                    title: form.title,
                    equipment_description: form.equipment_description || null,
                    problem_description: form.problem_description || null,
                    status: 'aberta',
                    priority: 'normal',
                    estimated_cost: 0,
                    parts_cost: 0,
                    labor_cost: 0,
                    discount_amount: 0,
                    warranty_months: 0,
                    turns_on: true,
                    items: [],
                }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('OS aberta com sucesso!')
                router.push(`/service-orders/${data.id}`)
                router.refresh()
            } else {
                toast.error(data.error || 'Erro ao criar OS')
            }
        })
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="p-4 max-w-2xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
            {/* Header */}
            <div className="flex items-center gap-3 py-2">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Zap className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">Abertura Rápida</h2>
                    <p className="text-[10px] text-muted-foreground font-bold">Preencha os campos essenciais e abra a OS em segundos</p>
                </div>
            </div>

            {/* Card */}
            <div className="bg-card/40 border border-white/5 rounded-[2rem] p-6 md:p-8 backdrop-blur-xl shadow-inner space-y-6">

                {/* Cliente */}
                <div className="relative z-[100]">
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-[0.2em] italic uppercase">
                        Cliente proprietário *
                    </label>
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

                {/* Tipo de dispositivo */}
                <div className="relative z-[90]">
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-[0.2em] italic uppercase">
                        Tipo de dispositivo *
                    </label>
                    <PremiumAutocomplete
                        value={form.title}
                        onChange={val => setForm(p => ({ ...p, title: val }))}
                        placeholder="Ex: Smartphone, Notebook..."
                        options={DEVICE_SUGGESTIONS}
                    />
                </div>

                {/* Modelo */}
                <div className="relative z-[80]">
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-[0.2em] italic uppercase">
                        Modelo / Especificação
                    </label>
                    <PremiumAutocomplete
                        value={form.equipment_description}
                        onChange={val => setForm(p => ({ ...p, equipment_description: val }))}
                        placeholder="Ex: iPhone 14 Pro, Samsung S23..."
                        options={DEVICE_SUGGESTIONS}
                    />
                </div>

                {/* Problema */}
                <div>
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-[0.2em] italic uppercase">
                        Problema relatado
                    </label>
                    <PremiumTextarea
                        value={form.problem_description}
                        onChange={e => setForm(p => ({ ...p, problem_description: e.target.value }))}
                        placeholder="Descreva brevemente o problema..."
                        rows={3}
                        className="bg-white/5 border-white/5 p-4"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 text-muted-foreground"
                >
                    <XCircle className="w-4 h-4" />
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-8 py-3 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Abrir OS
                </button>
            </div>

            {/* Modal novo cliente */}
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
                            if (customer?.id) {
                                setLocalCustomers(p => p.some(c => c.id === customer.id) ? p : [...p, customer])
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
