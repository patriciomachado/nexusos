'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    MoreHorizontal, Eye, Edit2, MessageCircle,
    Trash2, CheckCircle, Clock, Ban, ChevronRight,
    Settings, Printer, Share2, AlertTriangle, DollarSign,
    HandCoins
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PayOSModal from './PayOSModal'

interface OS {
    id: string
    order_number: string
    title: string
    status: string
    final_cost?: number
    estimated_cost?: number
    tracking_token?: string
    customers?: {
        name: string
        phone?: string
    }
    equipment_description?: string
}

interface Props {
    os: OS
    variant?: 'list' | 'detail'
}

const STATUS_OPTIONS = [
    { value: 'aberta', label: 'Aberta', icon: AlertTriangle, color: 'text-blue-400' },
    { value: 'em_andamento', label: 'Em Andamento', icon: Clock, color: 'text-yellow-400' },
    { value: 'concluida', label: 'Concluída', icon: CheckCircle, color: 'text-emerald-400' },
    { value: 'faturada', label: 'Faturada (Paga)', icon: DollarSign, color: 'text-emerald-600' },
    { value: 'cancelada', label: 'Cancelada', icon: Ban, color: 'text-red-400' },
]

export default function OSActions({ os, variant = 'list' }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isOpen, setIsOpen] = useState(false)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function handleStatusChange(newStatus: string) {
        setIsOpen(false)
        if (newStatus === os.status) return

        if (newStatus === 'faturada') {
            setIsPaymentModalOpen(true)
            return
        }

        startTransition(async () => {
            const res = await fetch(`/api/service-orders/${os.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (res.ok) {
                toast.success(`Status alterado para ${newStatus.replace('_', ' ')}`)
                router.refresh()
            } else {
                toast.error('Erro ao atualizar status')
            }
        })
    }

    function handleWhatsAppShare() {
        setIsOpen(false)
        const customer = os.customers
        const phone = customer?.phone?.replace(/\D/g, '')

        if (!customer || !phone) {
            toast.error('Cliente não possui telefone cadastrado')
            return
        }

        const message = `Olá ${customer.name}! 👋\n\nAcompanhe sua OS *#${os.order_number}* em tempo real:\n${window.location.origin}/tracking/${os.tracking_token}`
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    function handleCopyLink() {
        setIsOpen(false)
        if (!os.tracking_token) {
            toast.error('Link de acompanhamento não disponível.')
            return
        }
        const link = `${window.location.origin}/tracking/${os.tracking_token}`
        navigator.clipboard.writeText(link)
        toast.success('Link copiado para a área de transferência!')
    }

    return (
        <div ref={menuRef} className={cn("relative inline-block text-left", isOpen ? "z-[100]" : "z-auto")}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50",
                    variant === 'list'
                        ? "p-2 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                        : "px-5 py-2.5 rounded-2xl border border-border bg-card text-foreground hover:bg-muted font-bold text-xs uppercase tracking-[0.2em]"
                )}
            >
                {variant === 'list' ? (
                    <MoreHorizontal className="w-5 h-5" />
                ) : (
                    <>
                        <Settings className="w-4 h-4" />
                        Ação
                    </>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[110] backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden divide-y divide-border/50">
                    <div className="p-1.5 space-y-1">
                        {/* View/Detail Action */}
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                router.push(`/service-orders/${os.id}`)
                            }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all text-foreground hover:bg-muted group"
                        >
                            <Eye className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            <span>Ver Detalhes</span>
                        </button>

                        {/* Edit Action */}
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                router.push(`/service-orders/${os.id}/edit`)
                            }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all text-foreground hover:bg-muted group"
                        >
                            <Edit2 className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            <span>Editar Ordem</span>
                        </button>

                        {/* WhatsApp Action */}
                        <button
                            onClick={handleWhatsAppShare}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all text-green-600/80 dark:text-green-400/60 hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-400 group"
                        >
                            <MessageCircle className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            <span>Enviar WhatsApp</span>
                        </button>

                        <button
                            onClick={handleCopyLink}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all text-blue-600/80 dark:text-blue-400/60 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400 group"
                        >
                            <Share2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            <span>Copiar Link</span>
                        </button>

                        <div className="my-1 border-t border-border/50" />

                        {/* Status Submenu Header */}
                        <div className="px-3.5 py-2 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                            Alterar Status
                        </div>

                        {STATUS_OPTIONS.map((status) => {
                            const Icon = status.icon
                            return (
                                <button
                                    key={status.value}
                                    onClick={() => handleStatusChange(status.value)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all group",
                                        os.status === status.value
                                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                            : "text-foreground/70 hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 opacity-50 group-hover:opacity-100", status.color)} />
                                    <span>{status.label}</span>
                                </button>
                            )
                        })}

                        <div className="my-1 border-t border-border/50" />

                        {/* Print/Delete Placeholder */}
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                // Direct print without new tab using a hidden iframe
                                const iframe = document.createElement('iframe')
                                iframe.style.display = 'none'
                                iframe.src = `/print/os/${os.id}`
                                document.body.appendChild(iframe)

                                // Clean up after print
                                iframe.onload = () => {
                                    setTimeout(() => {
                                        // The print dialog is triggered by the PrintTrigger inside the iframe
                                        // We just need to give it time and then we could remove it, 
                                        // but usually keeping it until the session ends is fine.
                                        // Or remove it after a safe delay
                                        setTimeout(() => document.body.removeChild(iframe), 60000)
                                    }, 1000)
                                }
                            }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all text-foreground hover:bg-muted group"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Imprimir OS</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false)
                                toast.promise(
                                    fetch(`/api/service-orders/${os.id}`, { method: 'DELETE' }),
                                    {
                                        loading: 'Cancelando OS...',
                                        success: () => {
                                            router.refresh()
                                            return 'OS Cancelada'
                                        },
                                        error: 'Erro ao cancelar'
                                    }
                                )
                            }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all text-red-600/80 dark:text-red-400/60 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400 group"
                        >
                            <Ban className="w-4 h-4" />
                            <span>Cancelar OS</span>
                        </button>
                    </div>
                </div>
            )}

            <PayOSModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => router.refresh()}
                osId={os.id}
                osNumber={os.order_number}
                amount={os.final_cost || os.estimated_cost || 0}
            />
        </div>
    )
}

