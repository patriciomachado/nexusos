'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, CreditCard, Loader2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { PaymentMethodModel } from '@/types'

interface PayOSModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    osId: string
    osNumber: string
    amount: number
}

export default function PayOSModal({
    isOpen,
    onClose,
    onSuccess,
    osId,
    osNumber,
    amount
}: PayOSModalProps) {
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

    const handleConfirm = async () => {
        if (!paymentMethodId) {
            toast.error('Selecione um método de pagamento.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`/api/service-orders/${osId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'faturada',
                    payment_method_id: paymentMethodId
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Erro ao faturar OS.')
            }

            toast.success('OS Faturada e pagamento registrado!')
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-card border border-border w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="p-8 space-y-6 overflow-y-auto scrollbar-hide">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Faturar OS</h2>
                                <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest">OS Nº {osNumber}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="p-6 bg-muted/40 border border-border rounded-3xl text-center space-y-1">
                        <span className="text-[10px] text-foreground/60 font-black uppercase tracking-widest">Valor a Receber</span>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(amount)}</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/60 ml-1">Método de Pagamento</label>
                        <div className="grid grid-cols-1 gap-2">
                            {paymentMethods.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setPaymentMethodId(m.id)}
                                    className={cn(
                                        "flex items-center justify-between p-3.5 rounded-2xl border transition-all text-sm font-bold",
                                        paymentMethodId === m.id
                                            ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                            : "bg-muted/20 border-border hover:border-muted-foreground/30 text-foreground/80 focus:text-foreground hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            paymentMethodId === m.id ? "bg-primary/20" : "bg-muted"
                                        )}>
                                            <CreditCard className="w-4 h-4" />
                                        </div>
                                        {m.name}
                                    </div>
                                    {paymentMethodId === m.id && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-[2] py-3.5 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl hover:bg-foreground/90 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                            Confirmar Pagamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
