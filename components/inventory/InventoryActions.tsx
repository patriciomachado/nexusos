'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreVertical, Plus, Minus, Edit, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function InventoryActions({ itemId, companyId }: { itemId: string; companyId: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [adjusting, setAdjusting] = useState(false)
    const [adjustQty, setAdjustQty] = useState('')
    const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add')
    const [isPending, startTransition] = useTransition()

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
        if (!confirm('Tem certeza que deseja excluir este produto?')) return

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
                onClick={() => setOpen(!open)}
                className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all ring-1 ring-white/0 hover:ring-white/10"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/5 bg-[#0d0d12]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
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
                                onClick={() => { setOpen(false); handleDelete() }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir Produto
                            </button>
                        </div>
                    </div>
                </>
            )}
            {adjusting && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setAdjusting(false)}>
                    <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
                        <h3 className="font-semibold text-white mb-4">{adjustType === 'add' ? 'Registrar Entrada' : 'Registrar Saída'}</h3>
                        <input
                            type="number"
                            step="0.001"
                            value={adjustQty}
                            onChange={e => setAdjustQty(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 mb-4"
                            placeholder="Quantidade"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={handleAdjust} disabled={isPending} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                                {isPending ? 'Salvando...' : 'Confirmar'}
                            </button>
                            <button onClick={() => setAdjusting(false)} className="px-4 py-2 rounded-lg border border-white/10 text-white/70 text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
