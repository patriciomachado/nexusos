'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, CheckCircle2, XCircle, CreditCard, Wallet, Landmark, QrCode } from 'lucide-react'
import { PremiumInput } from '@/components/ui/PremiumInput'

interface PaymentMethod {
    id: string
    name: string
    code: string
    is_active: boolean
    company_id: string | null
}

export default function PaymentMethodsSettings() {
    const [methods, setMethods] = useState<PaymentMethod[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [newName, setNewName] = useState('')

    useEffect(() => {
        fetchMethods()
    }, [])

    async function fetchMethods() {
        try {
            const res = await fetch('/api/settings/payment-methods')
            const data = await res.json()
            setMethods(data)
        } catch (error) {
            toast.error('Erro ao carregar meios de pagamento')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAdd() {
        if (!newName.trim()) return

        startTransition(async () => {
            const res = await fetch('/api/settings/payment-methods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            })
            if (res.ok) {
                toast.success('Meio de pagamento adicionado!')
                setNewName('')
                fetchMethods()
            } else {
                toast.error('Erro ao adicionar')
            }
        })
    }

    async function toggleActive(pm: PaymentMethod) {
        if (pm.company_id === null) {
            toast.info('Meios de pagamento do sistema não podem ser desativados individualmente por aqui ainda.')
            return
        }

        startTransition(async () => {
            const res = await fetch(`/api/settings/payment-methods/${pm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !pm.is_active, name: pm.name })
            })
            if (res.ok) {
                fetchMethods()
            } else {
                toast.error('Erro ao atualizar')
            }
        })
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este meio de pagamento?')) return

        startTransition(async () => {
            const res = await fetch(`/api/settings/payment-methods/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                toast.success('Excluído com sucesso')
                fetchMethods()
            } else {
                toast.error('Erro ao excluir')
            }
        })
    }

    const getIcon = (code: string) => {
        if (code.includes('CASH') || code.includes('DINHEIRO')) return <Wallet className="w-5 h-5" />
        if (code.includes('CARD') || code.includes('CARTAO')) return <CreditCard className="w-5 h-5" />
        if (code.includes('PIX') || code.includes('QR')) return <QrCode className="w-5 h-5" />
        return <Landmark className="w-5 h-5" />
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Meios de Pagamento Aceitos</h2>
            </div>

            <div className="p-8 rounded-3xl bg-card/40 border border-border backdrop-blur-3xl shadow-2xl space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full group-hover:bg-blue-500/10 transition-colors" />

                {/* Add New */}
                <div className="flex gap-3 relative z-10">
                    <div className="flex-1">
                        <PremiumInput
                            placeholder="NOME DO NOVO MEIO (EX: BOLETO)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={isPending || !newName.trim()}
                        className="p-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                <div className="space-y-3 relative z-10">
                    {isLoading ? (
                        <div className="py-8 text-center animate-pulse text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">
                            Carregando...
                        </div>
                    ) : methods.length > 0 ? (
                        methods.map((pm) => (
                            <div key={pm.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/50 hover:border-blue-500/20 transition-all group/item">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${pm.is_active ? 'bg-blue-500/10 text-blue-400' : 'bg-muted/30 text-muted-foreground/40'}`}>
                                        {getIcon(pm.code)}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold tracking-tight transition-colors ${pm.is_active ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                                            {pm.name}
                                        </p>
                                        <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest mt-0.5">
                                            {pm.company_id ? 'Personalizado' : 'Padrão do Sistema'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleActive(pm)}
                                        disabled={isPending || pm.company_id === null}
                                        className={`p-2 rounded-xl transition-all ${pm.is_active ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/10' : 'text-muted-foreground/30 bg-muted/10 border border-border/30'} ${pm.company_id === null ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                        title={pm.company_id === null ? 'Meio padrão não pode ser alterado' : pm.is_active ? 'Desativar' : 'Ativar'}
                                    >
                                        {pm.is_active ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    </button>

                                    {pm.company_id && (
                                        <button
                                            onClick={() => handleDelete(pm.id)}
                                            disabled={isPending}
                                            className="p-2 rounded-xl text-rose-500/60 bg-rose-500/5 border border-rose-500/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all hover:scale-110 active:scale-95"
                                        >
                                            <Trash2 className="w-5 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center border-2 border-dashed border-border/10 rounded-3xl">
                            <p className="text-sm text-muted-foreground/20 italic tracking-widest uppercase">Nenhum meio de pagamento encontrado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
