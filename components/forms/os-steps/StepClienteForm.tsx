'use client'

import { useState } from 'react'
import CustomerAutocomplete from '@/components/ui/CustomerAutocomplete'
import PremiumSelect from '@/components/ui/PremiumSelect'
import PremiumModal from '@/components/ui/PremiumModal'
import CustomerForm from '@/components/forms/CustomerForm'
import { User, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

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

interface Customer { id: string; name: string }
interface Technician { id: string; name: string }

interface Props {
    form: any
    setForm: (fn: (prev: any) => any) => void
    customers: Customer[]
    setCustomers: (fn: (prev: Customer[]) => Customer[]) => void
    technicians: Technician[]
    companyId: string
    onNext: () => void
}

export default function StepClienteForm({ form, setForm, customers, setCustomers, technicians, companyId, onNext }: Props) {
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
    const [initialCustomerName, setInitialCustomerName] = useState('')

    function handleNext() {
        if (!form.customer_id) {
            toast.error('Selecione um cliente para continuar')
            return
        }
        onNext()
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Card header */}
            <div className="text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                    <User className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Quem é o cliente?</h2>
                <p className="text-sm text-muted-foreground">Identifique o proprietário do equipamento</p>
            </div>

            {/* Card */}
            <div className="bg-card/40 border border-border/60 rounded-2xl p-6 md:p-8 shadow-inner space-y-6">
                {/* Cliente */}
                <div className="space-y-2 relative z-[100]">
                    <label className="block text-[13px] font-medium text-muted-foreground">
                        Cliente proprietário *
                    </label>
                    <CustomerAutocomplete
                        customers={customers}
                        selectedId={form.customer_id}
                        onSelect={(id) => setForm(p => ({ ...p, customer_id: id }))}
                        onAdd={(name) => {
                            setInitialCustomerName(name)
                            setIsCustomerModalOpen(true)
                        }}
                    />
                </div>

                <div className="border-t border-border/60 pt-6 space-y-4">
                    <label className="block text-[13px] font-medium text-muted-foreground">
                        Detalhes da OS
                    </label>
                    {/* Técnico */}
                    <div className="relative z-[80]">
                        <PremiumSelect
                            label="Técnico Responsável"
                            options={technicians}
                            selectedId={form.technician_id}
                            onSelect={(id) => setForm(p => ({ ...p, technician_id: id }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-[70]">
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

            {/* CTA */}
            <div className="flex justify-end">
                <button
 type="button"
 onClick={handleNext}
 className="px-8 py-4 rounded-2xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-all flex items-center gap-3"
 >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
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
                                setCustomers(p => p.some(c => c.id === customer.id) ? p : [...p, customer])
                                setForm(p => ({ ...p, customer_id: customer.id }))
                            }
                            setIsCustomerModalOpen(false)
                        }}
                    />
                </div>
            </PremiumModal>
        </div>
    )
}
