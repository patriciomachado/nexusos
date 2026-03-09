'use client'

import { useState } from 'react'
import { X, Unlock, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface OpenCashModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function OpenCashModal({ isOpen, onClose, onSuccess }: OpenCashModalProps) {
    const [balance, setBalance] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const amount = parseFloat(balance)
        if (isNaN(amount) || amount < 0) {
            toast.error('Informe um valor inicial válido (mínimo 0).')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/cash-registers/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ opening_balance: amount })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Erro ao abrir caixa.')
            }

            toast.success('Caixa aberto com sucesso!')
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black tracking-tight uppercase">Abertura de Caixa</h2>
                            <p className="text-xs text-muted-foreground font-medium">Informe o valor em dinheiro disponível agora</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block ml-1">Saldo Inicial (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground/30 font-mono tracking-tighter">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={balance}
                                        onChange={(e) => setBalance(e.target.value)}
                                        placeholder="0,00"
                                        autoFocus
                                        className="w-full bg-muted/30 border-2 border-border focus:border-primary rounded-3xl py-6 pl-16 pr-6 text-3xl font-black tracking-tighter transition-all focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] outline-none placeholder:text-muted-foreground/20"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3",
                                loading
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30"
                            )}
                        >
                            {loading ? (
                                <ArrowRight className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Abrir agora
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
