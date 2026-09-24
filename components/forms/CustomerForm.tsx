'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { toast } from 'sonner'
import { PremiumInput } from '@/components/ui/PremiumInput'
import { PremiumTextarea } from '@/components/ui/PremiumTextarea'
import { User, Mail, Phone, FileText, MapPin, Globe, Hash, Save, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'

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
            try {
                const url = customerId ? `/api/customers/${customerId}` : '/api/customers'
                const method = customerId ? 'PUT' : 'POST'
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form)
                })

                let resJson: any
                const contentType = res.headers.get('content-type') || ''
                if (contentType.includes('application/json')) {
                    resJson = await res.json()
                } else {
                    // Fallback for non-JSON responses from Vercel/Proxy errors
                    const text = await res.text()
                    throw new Error(`Erro do servidor (${res.status}): ${text.substring(0, 100)}...`)
                }

                if (res.ok) {
                    toast.success(customerId ? 'Cliente atualizado!' : 'Cliente criado!')
                    const data = resJson
                    if (onSuccess) {
                        onSuccess({
                            id: data?.id || customerId || '',
                            name: form.name
                        })
                    } else {
                        router.push(`/customers/${data?.id || customerId}`)
                    }
                } else {
                    toast.error(resJson?.error || 'Erro ao salvar cliente')
                }
            } catch (err: any) {
                console.error('Error saving customer:', err)
                toast.error(err.message || 'Erro inesperatdo ao salvar cliente. Tente novamente.')
            }
        })
    }

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    async function handleDelete() {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/customers/${customerId}`, {
                    method: 'DELETE',
                })

                if (res.ok) {
                    toast.success('Cliente removido com sucesso!')
                    router.push('/customers')
                    router.refresh()
                } else {
                    const error = await res.json()
                    toast.error(error.error || 'Erro ao deletar cliente')
                }
            } catch (err: any) {
                toast.error('Erro ao conectar com o servidor')
            } finally {
                setShowDeleteConfirm(false)
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
                    !hideHeader ? "bg-card/40 border border-border rounded-2xl p-6" : "p-0"
                )}>
                    {!hideHeader && <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full transition-all group-hover:bg-indigo-500/10" />}

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-foreground/70 tracking-tight">Informações Básicas</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {fields.map(f => (
                                <div key={f.name} className={f.name === 'address' ? 'md:col-span-2' : ''}>
                                    <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">{f.label}</label>
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
                            <label className="block text-[13px] font-medium text-muted-foreground mb-2">Observações adicionais</label>
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
                    {customerId && (
                        <button
 type="button"
 onClick={() => setShowDeleteConfirm(true)}
 className="w-full sm:w-auto px-6 h-14 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 font-semibold text-[13px] hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
 >
                            <Trash2 className="w-3.5 h-3.5" />
                            EXCLUIR
                        </button>
                    )}
                    <button
 type="submit"
 disabled={isPending}
 className="bg-primary w-full sm:flex-1 disabled:opacity-50 text-white p-4 h-14 rounded-xl font-semibold text-[13px] transition-all active:scale-95 flex items-center justify-center gap-3"
 >
                        {isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isPending ? 'PROCESSANDO...' : 'SALVAR ALTERAÇÕES'}
                    </button>
                    <button
 type="button"
 onClick={() => onSuccess ? onSuccess({ id: '', name: '' }) : router.back()}
 className="w-full sm:w-auto px-8 h-14 rounded-xl border border-border bg-card text-foreground/40 font-semibold text-[13px] hover:bg-muted hover:text-foreground transition-all flex items-center justify-center gap-2"
 >
                        <X className="w-3.5 h-3.5" />
                        ABORTAR
                    </button>
                </div>
            </form>

            <PremiumConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir Cliente"
                description="Tem certeza que deseja desativar este cliente? Esta ação não removerá os dados permanentemente, mas o cliente não aparecerá mais nas listagens ativas."
                confirmLabel="Sim, Excluir"
                cancelLabel="Não, Manter"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>

    )
}

