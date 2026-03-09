'use client'

import { useState, useEffect } from 'react'
import { X, ArrowUpRight, ArrowDownRight, Save, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PaymentMethodModel } from '@/types'

interface ManualTransactionModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    type: 'entry' | 'exit'
    cashRegisterId: string
}

export default function ManualTransactionModal({
    isOpen,
    onClose,
    onSuccess,
    type,
    cashRegisterId
}: ManualTransactionModalProps) {
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [justification, setJustification] = useState('')
    const [paymentMethodId, setPaymentMethodId] = useState('')
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodModel[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetch('/api/payment-methods')
                .then(res => res.json())
                .then(data => {
                    setPaymentMethods(data)
                    const cash = data.find((m: any) => m.code === 'CASH')
                    if (cash) setPaymentMethodId(cash.id)
                    else if (data.length > 0) setPaymentMethodId(data[0].id)
                })
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const value = parseFloat(amount)
        if (isNaN(value) || value <= 0) {
            toast.error('Informe um valor válido.')
            return
        }

        if (!justification) {
            toast.error('A justificativa é obrigatória.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/cash-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cash_register_id: cashRegisterId,
                    type,
                    amount: value,
                    payment_method_id: paymentMethodId,
                    description: type === 'entry' ? `Suprimento: ${description || 'Manual'}` : `Sangria: ${description || 'Manual'}`,
                    source_type: type === 'entry' ? 'manual_suprimento' : 'manual_sangria',
                    justification
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Erro ao registrar transação.')
            }

            toast.success(type === 'entry' ? 'Suprimento registrado!' : 'Sangria registrada!')
            onSuccess()
            onClose()
            // Reset form
            setAmount('')
            setDescription('')
            setJustification('')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const isEntry = type === 'entry'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
                <div className={cn(
                    "absolute inset-0 opacity-[0.03] pointer-events-none",
                    isEntry ? "bg-emerald-500" : "bg-rose-500"
                )} />

                <div className="relative p-10 space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-3 rounded-2xl border",
                                isEntry ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                            )}>
                                {isEntry ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">
                                    {isEntry ? 'Registrar Suprimento' : 'Registrar Sangria'}
                                </h2>
                                <p className="text-xs text-muted-foreground font-semibold">Movimentação manual de valores em caixa</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full bg-muted/40 border border-border focus:border-primary rounded-2xl py-4 px-5 text-2xl font-black tracking-tight transition-all outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meio de Pagamento</label>
                                <select
                                    value={paymentMethodId}
                                    onChange={(e) => setPaymentMethodId(e.target.value)}
                                    className="w-full h-[62px] bg-muted/40 border border-border focus:border-primary rounded-2xl px-5 text-sm font-bold transition-all outline-none appearance-none"
                                >
                                    {paymentMethods.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição Breve</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ex: Adição de troco, Pagamento de frete..."
                                className="w-full bg-muted/40 border border-border focus:border-primary rounded-2xl py-4 px-5 text-sm font-medium transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5 font-black">
                                Justificativa <span className="text-rose-500">*</span>
                                <Info className="w-3 h-3 opacity-30" />
                            </label>
                            <textarea
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                placeholder="Descreva detalhadamente o motivo desta retirada ou entrada..."
                                className="w-full bg-muted/40 border border-border focus:border-primary rounded-2xl py-4 px-5 text-sm font-medium transition-all outline-none min-h-[100px] resize-none"
                                required
                            />
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-border/50">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "flex-[2] py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl",
                                    isEntry
                                        ? "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600"
                                        : "bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600",
                                    loading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {isEntry ? 'Registrar Suprimento' : 'Registrar Sangria'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
