'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Trash2, Edit, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { cn } from '@/lib/utils'

interface CustomerActionsProps {
    customerId: string
    customerName: string
    className?: string
    variant?: 'menu' | 'danger-button'
}

export default function CustomerActions({ 
    customerId, 
    customerName, 
    className, 
    variant = 'menu' 
}: CustomerActionsProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    async function handleDelete() {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/customers/${customerId}`, {
                    method: 'DELETE',
                })

                if (res.ok) {
                    toast.success('Cliente removido com sucesso!')
                    // Redirect to customers list after deletion
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

    if (variant === 'danger-button') {
        return (
            <div className={cn("w-full", className)}>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isPending}
                    className="w-full p-1 rounded-3xl bg-rose-500/10 border border-rose-500/20 group/del hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                    <div className="w-full py-4 rounded-2xl bg-card/40 text-rose-500 font-black text-xs uppercase tracking-wider group-hover/del:text-rose-400 transition-all text-center flex items-center justify-center gap-2">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Excluir Cliente
                    </div>
                </button>

                <PremiumConfirmDialog
                    isOpen={showDeleteConfirm}
                    title="Excluir Cliente"
                    description={`Tem certeza que deseja desativar o cliente "${customerName}"?`}
                    confirmLabel="Sim, Excluir"
                    cancelLabel="Não, Manter"
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            </div>
        )
    }

    return (
        <div className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
            <button 
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                }}
                className="p-2 rounded-xl bg-muted/20 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/40"
            >
                <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                router.push(`/customers/${customerId}/edit`)
                                setShowMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors border-b border-white/5"
                        >
                            <Edit className="w-4 h-4" />
                            Editar Dados
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowDeleteConfirm(true)
                                setShowMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir Cliente
                        </button>
                    </div>
                </>
            )}

            <PremiumConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir Cliente"
                description={`Tem certeza que deseja desativar o cliente "${customerName}"?`}
                confirmLabel="Sim, Excluir"
                cancelLabel="Não, Manter"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    )
}
