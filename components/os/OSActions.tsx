'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MoreHorizontal, Eye, Edit2, MessageCircle,
    CheckCircle, Clock, Ban, Trash,
    Settings, Printer, Share2, AlertTriangle, DollarSign,
    X, ChevronRight, LayoutGrid
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PayOSModal from './PayOSModal'
import PremiumConfirmDialog from '../ui/PremiumConfirmDialog'

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
    { value: 'aberta', label: 'Aberta', icon: AlertTriangle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { value: 'em_andamento', label: 'Andamento', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { value: 'concluida', label: 'Concluída', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { value: 'faturada', label: 'Paga', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
    { value: 'cancelada', label: 'Cancelada', icon: Ban, color: 'text-red-500', bg: 'bg-red-500/10' },
]

export default function OSActions({ os, variant = 'list' }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

    async function handleStatusChange(newStatus: string) {
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
        if (!os.tracking_token) {
            toast.error('Link de acompanhamento não disponível.')
            return
        }
        const link = `${window.location.origin}/tracking/${os.tracking_token}`
        navigator.clipboard.writeText(link)
        toast.success('Link copiado para a área de transferência!')
    }

    const ActionItems = () => (
        <div className="p-1.5 space-y-3 w-64 md:w-72">
            {/* Seção Principal de Ações */}
            <div className="grid grid-cols-2 gap-1.5">
                <button
                    onClick={() => router.push(`/service-orders/${os.id}`)}
                    className="flex flex-col items-start gap-1 justify-center px-3 py-2 rounded-xl text-[11px] transition-all text-foreground hover:bg-muted outline-none cursor-pointer border border-transparent bg-muted/30 border-border/40"
                >
                    <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Eye className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold">Ver OS</span>
                </button>

                <button
                    onClick={() => router.push(`/service-orders/${os.id}/edit`)}
                    className="flex flex-col items-start gap-1 justify-center px-3 py-2 rounded-xl text-[11px] transition-all text-foreground hover:bg-muted outline-none cursor-pointer border border-transparent bg-muted/30 border-border/40"
                >
                    <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
                        <Edit2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold">Editar</span>
                </button>

                <button
                    onClick={handleWhatsAppShare}
                    className="flex flex-col items-start gap-1 justify-center px-3 py-2 rounded-xl text-[11px] transition-all text-green-600 dark:text-green-400 hover:bg-green-500/10 outline-none cursor-pointer border border-transparent bg-green-500/5 border-green-500/10"
                >
                    <div className="p-1 rounded-lg bg-green-500/10">
                        <MessageCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold">WhatsApp</span>
                </button>

                <button
                    onClick={handleCopyLink}
                    className="flex flex-col items-start gap-1 justify-center px-3 py-2 rounded-xl text-[11px] transition-all text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 outline-none cursor-pointer border border-transparent bg-blue-500/5 border-blue-500/10"
                >
                    <div className="p-1 rounded-lg bg-blue-500/10">
                        <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold">Link</span>
                </button>
            </div>

            {/* Divisor Visual */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border/30"></div>
                </div>
                <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-black text-muted-foreground/40">
                    <span className="bg-card px-2">Status</span>
                </div>
            </div>

            {/* Grade de Status */}
            <div className="grid grid-cols-2 gap-1">
                {STATUS_OPTIONS.map((status) => {
                    const Icon = status.icon
                    const isActive = os.status === status.value
                    return (
                        <button
                            key={status.value}
                            onClick={() => handleStatusChange(status.value)}
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all outline-none cursor-pointer border relative",
                                isActive
                                    ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/10"
                                    : "bg-muted/20 border-transparent hover:bg-muted/50 hover:border-border/30 text-foreground/60"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-md shrink-0 transition-colors",
                                isActive ? "bg-white/20" : status.bg
                            )}>
                                <Icon className={cn("w-2.5 h-2.5", isActive ? "text-white" : status.color)} />
                            </div>
                            <span className="truncate flex-1">{status.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Ações Secundárias */}
            <div className="flex gap-1.5 pt-1">
                <button
                    onClick={() => {
                        const iframe = document.createElement('iframe')
                        iframe.style.display = 'none'
                        iframe.src = `/print/os/${os.id}`
                        document.body.appendChild(iframe)
                        iframe.onload = () => {
                            setTimeout(() => {
                                setTimeout(() => document.body.removeChild(iframe), 60000)
                            }, 1000)
                        }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[9px] font-bold transition-all text-foreground bg-muted/30 hover:bg-muted border border-border/20 outline-none cursor-pointer"
                >
                    <Printer className="w-3 h-3 opacity-60" />
                    Imprimir
                </button>

                <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[9px] font-bold transition-all text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 outline-none cursor-pointer"
                >
                    <Trash className="w-3 h-3 opacity-70" />
                    Excluir
                </button>
            </div>
        </div>
    )

    return (
        <>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        className={cn(
                            "flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 outline-none",
                            variant === 'list'
                                ? "p-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted border border-transparent active:bg-muted"
                                : "px-5 py-2.5 rounded-2xl border border-border bg-card text-foreground hover:bg-muted font-bold text-xs uppercase tracking-[0.2em]"
                        )}
                    >
                        {variant === 'list' ? (
                            <LayoutGrid className="w-5 h-5 md:hidden" />
                        ) : (
                            <Settings className="w-4 h-4 md:hidden" />
                        )}
                        
                        {variant === 'list' ? (
                            <MoreHorizontal className="w-5 h-5 hidden md:block" />
                        ) : (
                            <div className="hidden md:flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                <span>Ações</span>
                            </div>
                        )}

                        <span className="md:hidden font-bold text-[10px] uppercase tracking-widest">
                            {variant === 'list' ? '' : 'Ações'}
                        </span>
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align="end"
                        side="bottom"
                        sideOffset={8}
                        collisionPadding={16}
                        className="rounded-[1.5rem] border border-white/10 bg-card/95 shadow-[0_20px_50px_rgba(0,0,0,0.4)] z-[2005] backdrop-blur-3xl animate-in fade-in duration-200 overflow-y-auto max-h-[calc(100vh-40px)] outline-none ring-1 ring-white/10"
                    >
                        <ActionItems />
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <PayOSModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => router.refresh()}
                osId={os.id}
                osNumber={os.order_number}
                amount={os.final_cost || os.estimated_cost || 0}
            />
            <PremiumConfirmDialog
                isOpen={isDeleteModalOpen}
                title="Excluir Ordem de Serviço"
                description={`Tem certeza que deseja excluir a OS #${os.order_number}? Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir Agora"
                cancelLabel="Cancelar"
                onConfirm={() => {
                    setIsDeleteModalOpen(false)
                    toast.promise(
                        fetch(`/api/service-orders/${os.id}`, { method: 'DELETE' }),
                        {
                            loading: 'Excluindo OS...',
                            success: () => {
                                router.push('/service-orders')
                                return 'OS Excluída com sucesso'
                            },
                            error: 'Erro ao excluir'
                        }
                    )
                }}
                onCancel={() => setIsDeleteModalOpen(false)}
                variant="danger"
            />
        </>
    )
}

