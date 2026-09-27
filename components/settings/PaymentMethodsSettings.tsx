'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, CreditCard, Wallet, Landmark, QrCode, Loader2 } from 'lucide-react'
import { Field, Group, TextInput } from '@/components/ui/form'
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
            toast.error('Não foi possível carregar as formas de pagamento. Recarregue a página.')
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
                    toast.success('Forma de pagamento adicionada')
                    setNewName('')
                    fetchMethods()
                } else {
                    const error = await res.json()
                    toast.error(error.error || 'Erro ao adicionar')
                }
            } catch (error) {
                toast.error('Sem conexão. Tente de novo.')
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
                toast.error('Sem conexão. Tente de novo.')
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
                toast.error('Sem conexão. Tente de novo.')
            }
        })
    }

    const getIcon = (code: string) => {
        const c = code?.toLowerCase() || ''
        if (c.includes('money') || c.includes('dinheiro') || c.includes('cash')) return Wallet
        if (c.includes('card') || c.includes('cartao') || c.includes('credit') || c.includes('debit')) return CreditCard
        if (c.includes('pix') || c.includes('qr')) return QrCode
        return Landmark
    }

    return (
        <div className="space-y-5">
            <Group title="Nova forma" footer="Ex.: boleto, link de pagamento, promissória.">
                <div className="flex items-center gap-2 pr-2">
                    <Field label="Nome" htmlFor="pm-new" className="flex-1">
                        <TextInput
                            id="pm-new"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
                            placeholder="Ex.: Boleto…"
                        />
                    </Field>
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={isPending || !newName.trim()}
                        aria-label="Adicionar forma de pagamento"
                        className="w-11 h-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                        <Plus aria-hidden className="w-5 h-5" />
                    </button>
                </div>
            </Group>

            {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[15px] text-muted-foreground" aria-live="polite">
                    <Loader2 aria-hidden className="w-5 h-5 animate-spin" /> Carregando…
                </div>
            ) : methods.length > 0 ? (
                <Group title="Formas cadastradas" footer="As formas do sistema não podem ser desativadas nem removidas.">
                    {methods.map((pm) => {
                        const Icon = getIcon(pm.code)
                        const system = pm.company_id === null
                        return (
                            <div key={pm.id} className="flex items-center gap-3 px-4 min-h-[60px]">
                                <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', pm.is_active ? 'bg-primary/10 text-primary' : 'bg-foreground/[0.06] text-muted-foreground')}>
                                    <Icon aria-hidden className="w-4 h-4" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className={cn('block text-[17px] truncate', !pm.is_active && 'text-muted-foreground')}>{pm.name}</span>
                                    <span className="block text-[13px] text-muted-foreground">{system ? 'Do sistema' : pm.is_active ? 'Ativa' : 'Desativada'}</span>
                                </span>
                                {!system && (
                                    <>
                                        <label className="relative shrink-0 cursor-pointer" aria-label={pm.is_active ? `Desativar ${pm.name}` : `Ativar ${pm.name}`}>
                                            <input type="checkbox" className="sr-only peer" checked={pm.is_active} disabled={isPending} onChange={() => toggleActive(pm)} />
                                            <span aria-hidden className="block relative w-[51px] h-[31px] rounded-full bg-foreground/[0.12] peer-checked:bg-emerald-500 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[27px] after:h-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-[20px]" />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => { setPmToDelete(pm); setConfirmOpen(true) }}
                                            disabled={isPending}
                                            aria-label={`Remover ${pm.name}`}
                                            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 aria-hidden className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </Group>
            ) : (
                <p className="py-12 text-center text-[15px] text-muted-foreground">Nenhuma forma de pagamento cadastrada.</p>
            )}

            <PremiumConfirmDialog
                isOpen={confirmOpen}
                title="Remover forma de pagamento?"
                description={`“${pmToDelete?.name ?? ''}” sai da lista. As vendas antigas continuam registradas.`}
                confirmLabel="Remover"
                cancelLabel="Manter"
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
