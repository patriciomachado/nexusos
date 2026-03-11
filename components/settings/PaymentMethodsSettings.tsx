'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, CheckCircle2, XCircle, CreditCard, Wallet, Landmark, QrCode } from 'lucide-react'
import { PremiumInput } from '@/components/ui/PremiumInput'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { cn } from '@/lib/utils'

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

    // Confirmation Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pmToDelete, setPmToDelete] = useState<PaymentMethod | null>(null)

    useEffect(() => {
        fetchMethods()
    }, [])

    async function fetchMethods() {
        try {
            const res = await fetch('/api/settings/payment-methods')
            const data = await res.json()
            setMethods(Array.isArray(data) ? data : [])
        } catch (error) {
            toast.error('Erro ao carregar meios de pagamento')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAdd() {
        if (!newName.trim()) return

        startTransition(async () => {
            try {
                const res = await fetch('/api/settings/payment-methods', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName.trim() })
                })

                if (res.ok) {
                    toast.success('Meio de pagamento adicionado!')
                    setNewName('')
                    fetchMethods()
                } else {
                    const error = await res.json()
                    toast.error(error.error || 'Erro ao adicionar')
                }
            } catch (error) {
                toast.error('Erro de conexão')
            }
        })
    }

    async function toggleActive(pm: PaymentMethod) {
        if (pm.company_id === null) {
            toast.info('Meios padrão do sistema não podem ser desativados no momento.')
            return
        }

        startTransition(async () => {
            try {
                const res = await fetch(`/api/settings/payment-methods/${pm.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_active: !pm.is_active, name: pm.name })
                })
                if (res.ok) {
                    fetchMethods()
                } else {
                    toast.error('Erro ao atualizar status')
                }
            } catch (error) {
                toast.error('Erro de conexão')
            }
        })
    }

    async function handleDelete(id: string) {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/settings/payment-methods/${id}`, {
                    method: 'DELETE'
                })
                if (res.ok) {
                    toast.success('Excluído com sucesso')
                    fetchMethods()
                } else {
                    const data = await res.json()
                    toast.error(data.error || 'Erro ao excluir')
                }
            } catch (error) {
                toast.error('Erro de conexão')
            }
        })
    }

    const getIcon = (code: string) => {
        const c = code?.toLowerCase() || ''
        if (c.includes('money') || c.includes('dinheiro') || c.includes('cash')) return <Wallet className="w-5 h-5" />
        if (c.includes('card') || c.includes('cartao') || c.includes('credit') || c.includes('debit')) return <CreditCard className="w-5 h-5" />
        if (c.includes('pix') || c.includes('qr')) return <QrCode className="w-5 h-5" />
        if (c.includes('bank') || c.includes('transfer')) return <Landmark className="w-5 h-5" />
        return <Landmark className="w-5 h-5" />
    }

    return (
        <div className="space-y-10">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shadow-inner">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                        <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">Métodos de Faturamento</h2>
                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Gestão de gateways e recebimentos</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-8">
                {/* Add New Section */}
                <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 backdrop-blur-3xl shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700" />

                    <div className="relative z-10 space-y-6">
                        <div className="space-y-1 pr-12">
                            <h3 className="text-sm font-black text-foreground/80 uppercase tracking-tight">Expandir Opções</h3>
                            <p className="text-[10px] font-bold text-muted-foreground/60 leading-relaxed uppercase pr-10">Adicione métodos personalizados como Boleto, Link de Pagamento ou Promissória.</p>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <PremiumInput
                                    placeholder="NOME DO NOVO MÉTODO..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    className="bg-background/50 border-white/5 h-16 rounded-[1.5rem]"
                                />
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={isPending || !newName.trim()}
                                className="px-8 rounded-[1.5rem] bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 group/btn"
                            >
                                <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" />
                                <span className="hidden sm:inline">Adicionar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-30">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sincronizando Gateways...</p>
                        </div>
                    ) : methods.length > 0 ? (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {methods.map((pm) => (
                                <div key={pm.id} className={cn(
                                    "p-6 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-3xl transition-all duration-500 flex items-center justify-between group/item",
                                    pm.is_active ? 'hover:border-indigo-500/30 ring-1 ring-transparent hover:ring-indigo-500/10 shadow-lg' : 'opacity-60 grayscale'
                                )}>
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner",
                                            pm.is_active ? "bg-indigo-500/10 text-indigo-500 group-hover/item:scale-110" : "bg-muted text-muted-foreground/40"
                                        )}>
                                            {getIcon(pm.code)}
                                        </div>
                                        <div>
                                            <p className="font-black text-foreground tracking-tight uppercase leading-none">{pm.name}</p>
                                            <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-2">
                                                {pm.company_id ? 'Gateway Corporativo' : 'Padrão Nativo'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleActive(pm)}
                                            disabled={isPending || pm.company_id === null}
                                            className={cn(
                                                "p-3 rounded-xl transition-all border shrink-0",
                                                pm.is_active
                                                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/10'
                                                    : 'text-muted-foreground/30 bg-muted/10 border-white/5',
                                                pm.company_id === null ? 'cursor-not-allowed border-dashed opacity-50' : 'hover:scale-110 active:scale-95 hover:border-emerald-500/40'
                                            )}
                                            title={pm.company_id === null ? 'Ativo por Padrão do Sistema' : pm.is_active ? 'Desativar Método' : 'Ativar Método'}
                                        >
                                            {pm.is_active ? <CheckCircle2 className="w-5 h-5 shadow-sm" /> : <XCircle className="w-5 h-5 opacity-40" />}
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (pm.company_id === null) {
                                                    toast.error('Impossível remover métodos nativos do sistema por segurança.', {
                                                        description: 'Apenas métodos personalizados criados por você podem ser removidos.'
                                                    })
                                                    return
                                                }
                                                setPmToDelete(pm)
                                                setConfirmOpen(true)
                                            }}
                                            disabled={isPending}
                                            className={cn(
                                                "p-3 rounded-xl transition-all border shrink-0",
                                                pm.company_id === null
                                                    ? 'text-muted-foreground/20 bg-muted/5 border-white/5 cursor-not-allowed'
                                                    : 'text-rose-500/60 bg-rose-500/5 border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 shadow-sm hover:scale-110 active:scale-95'
                                            )}
                                        >
                                            <Trash2 className="w-5 h-5 shadow-sm-rose" />
                                        </button>

                                        {pm.company_id === null && (
                                            <div className="hidden lg:block px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[8px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">
                                                Sistema
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center border-4 border-dashed border-white/5 rounded-[3.5rem] bg-card/20 group">
                            <Landmark className="w-16 h-16 text-muted-foreground/10 mx-auto mb-6 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700" />
                            <p className="text-sm text-muted-foreground/30 font-black uppercase tracking-[0.4em]">Nenhum gateway configurado</p>
                        </div>
                    )}
                </div>
            </div>

            <PremiumConfirmDialog
                isOpen={confirmOpen}
                title="Remover Método"
                description={`Tem certeza que deseja apagar permanentemente o método "${pmToDelete?.name}"? Esta ação não pode ser desfeita.`}
                confirmLabel="Apagar Agora"
                cancelLabel="Manter Método"
                onConfirm={() => {
                    if (pmToDelete) handleDelete(pmToDelete.id)
                    setConfirmOpen(false)
                }}
                onCancel={() => setConfirmOpen(false)}
                variant="danger"
            />
        </div>
    )
}
