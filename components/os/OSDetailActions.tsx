'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ChevronRight, CircleDollarSign, Link2, Loader2, MessageCircle, MoreHorizontal, Pencil, Printer, Sparkles, Trash2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { cn } from '@/lib/utils'
import { OS_STATUS, OS_STATUS_ORDER, statusMeta } from '@/lib/os/status'
import PayOSModal from './PayOSModal'

interface Props {
    os: {
        id: string
        order_number: string
        status: string
        tracking_token?: string | null
        total: number
        customer?: { name: string; phone?: string | null } | null
    }
}

function waNumber(phone?: string | null) {
    const d = (phone ?? '').replace(/\D/g, '')
    if (!d) return null
    return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}

/** Main actions on an order: change status, message the customer, receive payment, more. */
export default function OSDetailActions({ os }: Props) {
    const router = useRouter()
    const [pending, start] = useTransition()
    const [statusOpen, setStatusOpen] = useState(false)
    const [moreOpen, setMoreOpen] = useState(false)
    const [paying, setPaying] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const meta = statusMeta(os.status)
    const trackingUrl = os.tracking_token && typeof window !== 'undefined' ? `${window.location.origin}/tracking/${os.tracking_token}` : null
    const phone = waNumber(os.customer?.phone)
    const closed = os.status === 'faturada' || os.status === 'cancelada'

    const changeStatus = (status: string) => {
        setStatusOpen(false)
        if (status === os.status) return
        if (status === 'faturada') { setPaying(true); return }
        start(async () => {
            const res = await fetch(`/api/service-orders/${os.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })
            if (res.ok) {
                toast.success(`Situação: ${statusMeta(status).label}`)
                router.refresh()
            } else {
                toast.error('Não foi possível mudar a situação')
            }
        })
    }

    const whatsapp = () => {
        if (!phone) return toast.error('O cliente não tem telefone cadastrado')
        const first = os.customer?.name?.split(' ')[0] ?? ''
        const text = `Olá${first ? ` ${first}` : ''}! Acompanhe sua OS ${os.order_number}${trackingUrl ? ` por aqui: ${trackingUrl}` : '.'}`
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
    }

    const copyLink = async () => {
        setMoreOpen(false)
        if (!trackingUrl) return toast.error('Link de acompanhamento indisponível')
        try {
            await navigator.clipboard.writeText(trackingUrl)
            toast.success('Link de acompanhamento copiado')
        } catch {
            toast.error('Não foi possível copiar')
        }
    }

    const tile = 'flex-1 min-w-0 h-[64px] rounded-2xl bg-card border border-border/60 flex flex-col items-center justify-center gap-1 text-[13px] font-medium hover:bg-foreground/[0.02] active:bg-foreground/[0.04] disabled:opacity-50'

    return (
        <>
            <div className="flex gap-2">
                <button type="button" onClick={() => setStatusOpen(true)} disabled={pending} className={cn(tile, 'flex-[1.4]')}>
                    {pending ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <span className={cn('w-2.5 h-2.5 rounded-full', meta.dot)} />}
                    <span className="truncate max-w-full px-2">{meta.label}</span>
                </button>
                <button type="button" onClick={whatsapp} className={cn(tile, 'text-green-700 dark:text-green-400')}>
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                </button>
                {!closed && (
                    <button type="button" onClick={() => setPaying(true)} className={cn(tile, 'text-primary')}>
                        <CircleDollarSign className="w-5 h-5" />
                        Receber
                    </button>
                )}
                <button type="button" onClick={() => setMoreOpen(true)} className={tile} aria-label="Mais ações">
                    <MoreHorizontal className="w-5 h-5" />
                    Mais
                </button>
            </div>

            <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title="Situação da OS" subtitle={os.order_number}>
                <ul className="rounded-xl bg-foreground/[0.03] divide-y divide-border/60 overflow-hidden">
                    {OS_STATUS_ORDER.map(s => (
                        <li key={s}>
                            <button type="button" onClick={() => changeStatus(s)} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left hover:bg-foreground/[0.03]">
                                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', OS_STATUS[s].dot)} />
                                <span className="flex-1 text-[17px]">{OS_STATUS[s].label}</span>
                                {s === 'faturada' && s !== os.status && <span className="text-[13px] text-muted-foreground">registra o pagamento</span>}
                                {s === os.status && <Check className="w-5 h-5 text-primary" />}
                            </button>
                        </li>
                    ))}
                </ul>
            </Sheet>

            <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais ações" subtitle={os.order_number}>
                <ul className="rounded-xl bg-foreground/[0.03] divide-y divide-border/60 overflow-hidden">
                    {[
                        { href: `/service-orders/${os.id}/edit`, icon: Pencil, label: 'Editar OS' },
                        { href: `/service-orders/${os.id}/print`, icon: Printer, label: 'Imprimir' },
                        { href: `/studio?os_id=${os.id}`, icon: Sparkles, label: 'Criar post no Studio' },
                    ].map(a => (
                        <li key={a.label}>
                            <Link href={a.href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 px-4 min-h-[52px] hover:bg-foreground/[0.03]">
                                <a.icon className="w-5 h-5 text-primary shrink-0" />
                                <span className="flex-1 text-[17px]">{a.label}</span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </Link>
                        </li>
                    ))}
                    <li>
                        <button type="button" onClick={copyLink} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left hover:bg-foreground/[0.03]">
                            <Link2 className="w-5 h-5 text-primary shrink-0" />
                            <span className="flex-1 text-[17px]">Copiar link de acompanhamento</span>
                        </button>
                    </li>
                </ul>
                <button type="button" onClick={() => { setMoreOpen(false); setDeleting(true) }} className="mt-4 w-full h-12 rounded-xl bg-foreground/[0.03] text-[17px] text-red-600 dark:text-red-400 inline-flex items-center justify-center gap-2">
                    <Trash2 className="w-5 h-5" /> Excluir OS
                </button>
            </Sheet>

            <PayOSModal
                isOpen={paying}
                onClose={() => setPaying(false)}
                onSuccess={() => router.refresh()}
                osId={os.id}
                osNumber={os.order_number}
                amount={os.total}
            />
            <PremiumConfirmDialog
                isOpen={deleting}
                title="Excluir OS"
                description={`Excluir a ${os.order_number}? Isso não pode ser desfeito.`}
                confirmLabel="Excluir"
                cancelLabel="Cancelar"
                variant="danger"
                onCancel={() => setDeleting(false)}
                onConfirm={() => {
                    setDeleting(false)
                    toast.promise(fetch(`/api/service-orders/${os.id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error() }), {
                        loading: 'Excluindo…',
                        success: () => { router.push('/service-orders'); router.refresh(); return 'OS excluída' },
                        error: 'Não foi possível excluir',
                    })
                }}
            />
        </>
    )
}
