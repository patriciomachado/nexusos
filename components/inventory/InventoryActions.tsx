'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreVertical, Plus, Minus, Edit, Trash2, ArrowUpRight, ArrowDownRight, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'

export default function InventoryActions({ itemId, companyId }: { itemId: string; companyId: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [adjusting, setAdjusting] = useState(false)
    const [adjustQty, setAdjustQty] = useState('')
    const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add')
    const [isDeleting, setIsDeleting] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const triggerRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.right + window.scrollX - 192 // 192 is the width of the dropdown (w-48)
            })
        }
    }, [open])

    async function handleAdjust() {
        const qty = parseFloat(adjustQty)
        if (!qty || qty <= 0) { toast.error('Quantidade inválida'); return }
        startTransition(async () => {
            const res = await fetch(`/api/inventory/${itemId}/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: adjustType === 'add' ? qty : -qty }),
            })
            if (res.ok) {
                toast.success('Estoque ajustado!')
                setAdjusting(false)
                setAdjustQty('')
                router.refresh()
            } else {
                toast.error('Erro ao ajustar estoque')
            }
        })
    }

    async function handleDelete() {
        startTransition(async () => {
            const res = await fetch(`/api/inventory/${itemId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Produto excluído!')
                router.refresh()
            } else {
                toast.error('Erro ao excluir produto')
            }
        })
    }

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                onClick={() => setOpen(!open)}
                className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all ring-1 ring-white/0 hover:ring-white/10"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {open && createPortal(
                <>
                    <div className="fixed inset-0 z-[99998]" onClick={() => setOpen(false)} />
                    <div
                        style={{
                            position: 'absolute',
                            top: coords.top + 8,
                            left: coords.left,
                            zIndex: 99999
                        }}
                        className="w-48 rounded-2xl border border-white/5 bg-[#0d0d12]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="p-1.5 space-y-0.5">
                            <button
                                onClick={() => { setOpen(false); router.push(`/inventory/${itemId}/edit`) }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                <Edit className="w-3.5 h-3.5 text-indigo-400" />
                                Editar Registro
                            </button>

                            <div className="h-px bg-white/5 my-1" />

                            <button
                                onClick={() => { setOpen(false); setAdjusting(true); setAdjustType('add') }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                                Entrada de Estoque
                            </button>
                            <button
                                onClick={() => { setOpen(false); setAdjusting(true); setAdjustType('remove') }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                <ArrowDownRight className="w-3.5 h-3.5 text-orange-400" />
                                Saída de Estoque
                            </button>

                            <div className="h-px bg-white/5 my-1" />

                            <button
                                onClick={() => { setOpen(false); setIsDeleting(true) }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir Produto
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}
            {adjusting && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100001] animate-in fade-in duration-300" onClick={() => setAdjusting(false)}>
                    <div className="bg-card border border-white/10 rounded-[2rem] p-8 w-full max-w-sm shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={cn(
                                "p-2.5 rounded-2xl border",
                                adjustType === 'add' ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-orange-400 bg-orange-400/10 border-orange-400/20"
                            )}>
                                {adjustType === 'add' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">{adjustType === 'add' ? 'Registrar Entrada' : 'Registrar Saída'}</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest text-center">QUANTIDADE</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={adjustQty}
                                    onChange={e => setAdjustQty(e.target.value)}
                                    className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-sm font-black text-center focus:outline-none focus:border-primary/50 transition-all placeholder:opacity-30"
                                    placeholder="0.000"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setAdjusting(false)}
                                    className="h-14 rounded-2xl bg-muted/30 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-white/5 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAdjust}
                                    disabled={isPending || !adjustQty}
                                    className={cn(
                                        "h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50",
                                        adjustType === 'add' ? "bg-emerald-500 shadow-emerald-500/20 text-white" : "bg-orange-500 shadow-orange-500/20 text-white"
                                    )}
                                >
                                    {isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar'}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setAdjusting(false)}
                            className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-xl transition-all text-muted-foreground/40 hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>,
                document.body
            )}

            <PremiumConfirmDialog
                isOpen={isDeleting}
                title="Excluir Produto?"
                description="Tem certeza que deseja excluir este produto do estoque? Esta ação não pode ser desfeita."
                confirmLabel="Excluir Agora"
                cancelLabel="Manter Produto"
                onConfirm={() => {
                    handleDelete()
                    setIsDeleting(false)
                }}
                onCancel={() => setIsDeleting(false)}
                variant="danger"
            />
        </div>
    )
}
