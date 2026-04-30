'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MoreHorizontal, Eye, Edit2, MessageCircle,
    CheckCircle, Clock, Ban,
    Settings, Printer, Share2, AlertTriangle, DollarSign,
    X, ChevronRight, LayoutGrid
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
    const [isMobile, setIsMobile] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    async function handleStatusChange(newStatus: string) {
        setIsSheetOpen(false)
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
        setIsSheetOpen(false)
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
        setIsSheetOpen(false)
        if (!os.tracking_token) {
            toast.error('Link de acompanhamento não disponível.')
            return
        }
        const link = `${window.location.origin}/tracking/${os.tracking_token}`
        navigator.clipboard.writeText(link)
        toast.success('Link copiado para a área de transferência!')
    }

    const ActionItems = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className={cn("p-2 space-y-4", isMobile && "p-6 pb-10")}>
            {/* Seção Principal de Ações */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => {
                        setIsSheetOpen(false)
                        router.push(`/service-orders/${os.id}`)
                    }}
                    className={cn(
                        "flex flex-col items-start gap-1 justify-center px-3 py-3 rounded-2xl text-sm transition-all text-foreground hover:bg-muted outline-none cursor-pointer border border-transparent bg-muted/30 border-border/40",
                        !isMobile && "py-2.5"
                    )}
                >
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Eye className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">Ver OS</span>
                </button>

                <button
                    onClick={() => {
                        setIsSheetOpen(false)
                        router.push(`/service-orders/${os.id}/edit`)
                    }}
                    className={cn(
                        "flex flex-col items-start gap-1 justify-center px-3 py-3 rounded-2xl text-sm transition-all text-foreground hover:bg-muted outline-none cursor-pointer border border-transparent bg-muted/30 border-border/40",
                        !isMobile && "py-2.5"
                    )}
                >
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <Edit2 className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">Editar</span>
                </button>

                <button
                    onClick={handleWhatsAppShare}
                    className={cn(
                        "flex flex-col items-start gap-1 justify-center px-3 py-3 rounded-2xl text-sm transition-all text-green-600 dark:text-green-400 hover:bg-green-500/10 outline-none cursor-pointer border border-transparent bg-green-500/5 border-green-500/10",
                        !isMobile && "py-2.5"
                    )}
                >
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                        <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">WhatsApp</span>
                </button>

                <button
                    onClick={handleCopyLink}
                    className={cn(
                        "flex flex-col items-start gap-1 justify-center px-3 py-3 rounded-2xl text-sm transition-all text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 outline-none cursor-pointer border border-transparent bg-blue-500/5 border-blue-500/10",
                        !isMobile && "py-2.5"
                    )}
                >
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Share2 className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">Link</span>
                </button>
            </div>

            {/* Divisor Visual */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border/50"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">
                    <span className="bg-card px-3">Status</span>
                </div>
            </div>

            {/* Grade de Status */}
            <div className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map((status) => {
                    const Icon = status.icon
                    const isActive = os.status === status.value
                    return (
                        <button
                            key={status.value}
                            onClick={() => handleStatusChange(status.value)}
                            className={cn(
                                "flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] transition-all outline-none cursor-pointer border",
                                isActive
                                    ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
                                    : "bg-muted/20 border-transparent hover:bg-muted hover:border-border/50 text-foreground/70"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-md shrink-0",
                                isActive ? "bg-white/20" : status.bg
                            )}>
                                <Icon className={cn("w-3 h-3", isActive ? "text-white" : status.color)} />
                            </div>
                            <span className="font-bold truncate">{status.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Ações Secundárias */}
            <div className="flex gap-2">
                <button
                    onClick={() => {
                        setIsSheetOpen(false)
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
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[10px] font-bold transition-all text-foreground bg-muted/50 hover:bg-muted border border-border/50 outline-none cursor-pointer"
                >
                    <Printer className="w-3.5 h-3.5 opacity-70" />
                    Imprimir
                </button>

                <button
                    onClick={() => {
                        setIsSheetOpen(false)
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
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[10px] font-bold transition-all text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 outline-none cursor-pointer"
                >
                    <Ban className="w-3.5 h-3.5 opacity-70" />
                    Cancelar
                </button>
            </div>
        </div>
    )

    return (
        <>
            {isMobile ? (
                <>
                    <button
                        onClick={() => setIsSheetOpen(true)}
                        className={cn(
                            "flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 outline-none",
                            variant === 'list'
                                ? "p-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted border border-transparent active:bg-muted"
                                : "px-5 py-2.5 rounded-2xl border border-border bg-card text-foreground hover:bg-muted font-bold text-xs uppercase tracking-[0.2em]"
                        )}
                    >
                        {variant === 'list' ? (
                            <LayoutGrid className="w-5 h-5" />
                        ) : (
                            <>
                                <Settings className="w-4 h-4" />
                                Ação
                            </>
                        )}
                    </button>

                    <AnimatePresence>
                        {isSheetOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] animate-in fade-in duration-300"
                                    onClick={() => setIsSheetOpen(false)}
                                />
                                <motion.div
                                    {...({
                                        initial: { y: "100%" },
                                        animate: { y: 0 },
                                        exit: { y: "100%" },
                                        transition: { type: "spring", damping: 30, stiffness: 300 },
                                        className: "fixed inset-x-0 bottom-0 bg-card border-t border-border rounded-t-[2.5rem] z-[2001] shadow-2xl pb-safe ring-1 ring-white/10"
                                    } as any)}
                                >
                                    <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2 opacity-50" />
                                    
                                    <div className="flex items-center justify-between px-6 py-4">
                                        <div className="space-y-0.5">
                                            <h3 className="text-xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">Nexus Ações</h3>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">OS #{os.order_number}</p>
                                        </div>
                                        <button 
                                            onClick={() => setIsSheetOpen(false)}
                                            className="p-2.5 rounded-2xl bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="max-h-[80vh] overflow-y-auto overflow-x-hidden">
                                        <ActionItems isMobile />
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            ) : (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 outline-none",
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
                                    Ações
                                </>
                            )}
                        </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content 
                            align="end" 
                            side="bottom"
                            sideOffset={12}
                            avoidCollisions={false}
                            className="w-72 rounded-[1.5rem] border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.6)] z-[1010] backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[calc(100vh-100px)] outline-none ring-1 ring-white/10"
                        >
                            <ActionItems />
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            )}


            <PayOSModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => router.refresh()}
                osId={os.id}
                osNumber={os.order_number}
                amount={os.final_cost || os.estimated_cost || 0}
            />
        </>
    )
}

