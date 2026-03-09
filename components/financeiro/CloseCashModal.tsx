'use client'

import { useState } from 'react'
import { X, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { CashRegister } from '@/types'

interface CloseCashModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    cashRegister: CashRegister
    balance: number
}

export default function CloseCashModal({
    isOpen,
    onClose,
    onSuccess,
    cashRegister,
    balance
}: CloseCashModalProps) {
    const [physicalBalance, setPhysicalBalance] = useState('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'review' | 'success'>('review')

    if (!isOpen) return null

    const handleConfirm = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/cash-registers/${cashRegister.id}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Erro ao fechar caixa.')
            }

            toast.success('Caixa fechado com sucesso!')
            setStep('success')
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 3000)
        } catch (error: any) {
            toast.error(error.message)
            setLoading(false)
        }
    }

    const difference = parseFloat(physicalBalance) - balance

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">

                {step === 'review' ? (
                    <div className="p-10 space-y-8">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">Fechar Caixa</h2>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Resumo do Período</p>
                                </div>
                            </div>
                            {!loading && (
                                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-muted/30 border border-border rounded-3xl space-y-1">
                                <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">Saldo Inicial</span>
                                <p className="text-xl font-bold text-foreground">{formatCurrency(cashRegister.opening_balance)}</p>
                            </div>
                            <div className="p-6 bg-muted/60 border border-border rounded-3xl space-y-1 ring-1 ring-primary/20">
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest">Saldo Esperado</span>
                                <p className="text-xl font-black text-primary">{formatCurrency(balance)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Saldo Físico em Maos (Opcional)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={physicalBalance}
                                    onChange={(e) => setPhysicalBalance(e.target.value)}
                                    placeholder="Quanto você contou em dinheiro?"
                                    className="w-full bg-muted/40 border border-border focus:border-primary rounded-2xl py-4 px-5 text-xl font-bold tracking-tight transition-all outline-none"
                                />
                            </div>

                            {physicalBalance && (
                                <div className={cn(
                                    "p-4 rounded-2xl border flex items-center justify-between animate-in slide-in-from-top-2",
                                    difference === 0 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" :
                                        difference > 0 ? "bg-blue-500/5 border-blue-500/20 text-blue-500" : "bg-rose-500/5 border-rose-500/20 text-rose-500"
                                )}>
                                    <div className="flex items-center gap-2">
                                        {difference === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        <span className="text-xs font-bold uppercase tracking-widest">Diferença</span>
                                    </div>
                                    <span className="font-black text-lg">{formatCurrency(difference)}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                            <p className="text-[10px] text-amber-500/80 font-bold leading-relaxed text-center italic">
                                Ao fechar o caixa, você não poderá registrar novas movimentações para este período. O sistema salvará o saldo atual como base de auditoria.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all active:scale-95"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className="flex-[2] py-4 rounded-2xl bg-foreground text-background font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl hover:bg-foreground/90 disabled:opacity-50"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                Confirmar e Fechar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-20 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 animate-bounce">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black tracking-tight uppercase">Caixa Fechado!</h2>
                            <p className="text-muted-foreground text-sm font-medium">Relatório gerado com sucesso para auditoria.</p>
                        </div>
                        <div className="p-1 px-4 rounded-full bg-muted text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Redirecionando...
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
