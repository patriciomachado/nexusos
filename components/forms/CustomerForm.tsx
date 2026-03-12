'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { toast } from 'sonner'
import { PremiumInput } from '@/components/ui/PremiumInput'
import { PremiumTextarea } from '@/components/ui/PremiumTextarea'
import { User, Mail, Phone, FileText, MapPin, Globe, Hash, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
    companyId: string
    customerId?: string
    initial?: any
    hideHeader?: boolean
    onSuccess?: (customer: { id: string, name: string }) => void
}

export default function CustomerForm({ companyId, customerId, initial, hideHeader, onSuccess }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        name: initial?.name || '',
        email: initial?.email || '',
        phone: initial?.phone || '',
        cpf_cnpj: initial?.cpf_cnpj || '',
        address: initial?.address || '',
        city: initial?.city || '',
        state: initial?.state || '',
        zip_code: initial?.zip_code || '',
        notes: initial?.notes || '',
    })

    function handleChange(name: string, value: string) {
        setForm(p => ({ ...p, [name]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            const url = customerId ? `/api/customers/${customerId}` : '/api/customers'
            const method = customerId ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            const { data, error } = await res.json()
            if (res.ok) {
                toast.success(customerId ? 'Cliente atualizado!' : 'Cliente criado!')
                if (onSuccess) {
                    onSuccess({ id: data.id || customerId, name: form.name })
                } else {
                    router.push(`/customers/${data.id || customerId}`)
                }
            } else {
                toast.error(error || 'Erro ao salvar cliente')
            }
        })
    }

    const fields = [
        { label: 'NOME COMPLETO *', name: 'name', type: 'text', required: true, placeholder: 'Ex: João Silva', icon: <User className="w-4 h-4" /> },
        { label: 'E-MAIL DE CONTATO', name: 'email', type: 'email', placeholder: 'joao@empresa.com', icon: <Mail className="w-4 h-4" /> },
        { label: 'TELEFONE / WHATSAPP', name: 'phone', type: 'tel', placeholder: '(11) 99999-9999', icon: <Phone className="w-4 h-4" /> },
        { label: 'CPF OU CNPJ', name: 'cpf_cnpj', type: 'text', placeholder: '000.000.000-00', icon: <FileText className="w-4 h-4" /> },
        { label: 'ENDEREÇO RESIDENCIAL/COMERCIAL', name: 'address', type: 'text', placeholder: 'Rua, número, bairro', icon: <MapPin className="w-4 h-4" /> },
        { label: 'CIDADE', name: 'city', type: 'text', placeholder: 'Ex: São Paulo', icon: <Globe className="w-4 h-4" /> },
        { label: 'ESTADO', name: 'state', type: 'text', placeholder: 'SP', icon: <Globe className="w-4 h-4" /> },
        { label: 'CEP', name: 'zip_code', type: 'text', placeholder: '00000-000', icon: <Hash className="w-4 h-4" /> },
    ]

    return (
        <div className={cn("animate-fade-in pb-10", hideHeader && "pb-0")}>
            {!hideHeader && <Header title={customerId ? 'Atualizar Registro' : 'Novo Cadastro de Cliente'} />}

            <form onSubmit={handleSubmit} className={cn("p-4 max-w-5xl mx-auto space-y-6", !hideHeader && "mt-4")}>
                <div className={cn(
                    "relative overflow-hidden group transition-all",
                    !hideHeader ? "bg-card/40 border border-border rounded-[2.5rem] p-6 shadow-lg backdrop-blur-3xl" : "p-0"
                )}>
                    {!hideHeader && <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full transition-all group-hover:bg-indigo-500/10" />}

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-foreground/70 tracking-tight uppercase tracking-widest">Informações Básicas</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {fields.map(f => (
                                <div key={f.name} className={f.name === 'address' ? 'md:col-span-2' : ''}>
                                    <label className="block text-[9px] font-black text-muted-foreground/70 mb-1.5 uppercase tracking-widest">{f.label}</label>
                                    <PremiumInput
                                        name={f.name}
                                        type={f.type}
                                        value={(form as any)[f.name]}
                                        onChange={(e) => handleChange(f.name, e.target.value)}
                                        required={f.required}
                                        placeholder={f.placeholder}
                                        icon={f.icon}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="pt-2">
                            <label className="block text-[9px] font-black text-muted-foreground/70 mb-2 uppercase tracking-widest">OBSERVAÇÕES ADICIONAIS</label>
                            <PremiumTextarea
                                name="notes"
                                value={form.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                rows={3}
                                placeholder="Anotações internas..."
                                className="border-border focus:border-primary/30 min-h-[80px]"
                            />
                        </div>
                    </div>
                </div>

                <div className={cn(
                    "flex flex-col sm:flex-row items-center gap-4 pt-2",
                    hideHeader && "border-t border-border mt-6 pt-6"
                )}>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full sm:flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-50 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isPending ? 'PROCESSANDO...' : 'SALVAR ALTERAÇÕES'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onSuccess ? onSuccess({ id: '', name: '' }) : router.back()}
                        className="w-full sm:w-auto px-8 py-4 rounded-xl border border-border bg-card text-foreground/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-muted hover:text-foreground transition-all flex items-center justify-center gap-2"
                    >
                        <X className="w-3.5 h-3.5" />
                        ABORTAR
                    </button>
                </div>
            </form>
        </div>
    )
}

