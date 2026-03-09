'use client'

import { useState, useEffect } from 'react'
import { X, Check, Loader2, Wallet, Users, Info } from 'lucide-react'
import { usePDVStore } from '@/store/usePDVStore'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { PaymentMethodModel, CashRegister, Customer } from '@/types'

import CustomerAutocomplete from '@/components/ui/CustomerAutocomplete'

interface FinishSaleModalProps {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    total: number
    discount: number
    finalAmount: number
}

export default function FinishSaleModal({ isOpen, setIsOpen, total, discount, finalAmount }: FinishSaleModalProps) {
    const { cart, clearCart } = usePDVStore()
    const [loading, setLoading] = useState(false)
    const [loadingInit, setLoadingInit] = useState(true)
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodModel[]>([])
    const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])

    // Form State
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (isOpen) {
            initData()
        }
    }, [isOpen])

    const initData = async () => {
        setLoadingInit(true)
        try {
            const [pmRes, crRes, custRes] = await Promise.all([
                fetch('/api/payment-methods'),
                fetch('/api/cash-registers/current'),
                fetch('/api/customers')
            ])

            const [pmData, crData, custData] = await Promise.all([
                pmRes.json(),
                crRes.json(),
                custRes.json()
            ])

            setPaymentMethods(pmData)
            setCashRegister(crData)
            setCustomers(custData.data || [])

            if (pmData.length > 0) setSelectedPaymentMethod(pmData[0].id)
        } catch (error) {
            console.error('Error initializing finish sale modal:', error)
            toast.error('Erro ao carregar dados de checkout.')
        } finally {
            setLoadingInit(false)
        }
    }

    const handleFinish = async () => {
        if (!cashRegister) {
            toast.error('É necessário um caixa aberto para finalizar a venda.')
            return
        }
        if (!selectedPaymentMethod) {
            toast.error('Selecione um meio de pagamento.')
            return
        }

        setLoading(true)
        try {
            const saleData = {
                customer_id: selectedCustomer || undefined,
                cash_register_id: cashRegister.id,
                items: cart.map(item => ({
                    inventory_item_id: item.product.id,
                    item_name: item.product.name,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_price: item.total
                })),
                total_amount: total,
                discount_amount: discount,
                final_amount: finalAmount,
                payment_method_id: selectedPaymentMethod,
                notes
            }

            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Erro ao processar venda')

            toast.success('Venda finalizada com sucesso!')
            clearCart()
            setIsOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border border-border w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-8 border-b border-border bg-muted/30">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black tracking-tight">Finalizar Venda</h2>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Checkout Nexus PDV</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-3 rounded-2xl hover:bg-muted transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    {loadingInit ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground font-medium">Preparando checkout...</p>
                        </div>
                    ) : (
                        <>
                            {/* Cash Register State */}
                            {!cashRegister && (
                                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-4">
                                    <Info className="w-5 h-5 text-destructive mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-destructive">Nenhum caixa aberto encontrado!</p>
                                        <p className="text-xs text-destructive/80">Você precisa abrir o caixa no módulo de Finanças antes de realizar vendas no PDV.</p>
                                    </div>
                                </div>
                            )}

                            {/* Customer Selection */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                                    <Users className="w-3 h-3" /> Identificação do Cliente
                                </label>
                                <CustomerAutocomplete
                                    customers={customers}
                                    selectedId={selectedCustomer}
                                    onSelect={setSelectedCustomer}
                                    placeholder="Venda Direta (Consumidor Final)"
                                />
                                <p className="text-[10px] text-muted-foreground ml-2 italic text-center">Deixe em branco para <strong>Venda Direta (Consumidor Final)</strong></p>
                            </div>

                            {/* Payment Methods */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                                    <Wallet className="w-3 h-3" /> Meio de Pagamento
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {paymentMethods.map(pm => (
                                        <button
                                            key={pm.id}
                                            onClick={() => setSelectedPaymentMethod(pm.id)}
                                            className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${selectedPaymentMethod === pm.id
                                                ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                                                : 'bg-muted border-transparent hover:border-border'
                                                }`}
                                        >
                                            <span className="font-bold text-sm tracking-tight">{pm.name}</span>
                                            {selectedPaymentMethod === pm.id && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Observações</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-4 rounded-2xl bg-muted border-none text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
                                    placeholder="Ex: Pagamento parcelado, desconto especial..."
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-8 bg-muted/30 border-t border-border flex items-center justify-between gap-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">A pagar</p>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(finalAmount)}</p>
                    </div>

                    <button
                        onClick={handleFinish}
                        disabled={loading || !cashRegister}
                        className="flex-1 max-w-[200px] flex items-center justify-center gap-3 bg-primary text-primary-foreground h-16 rounded-3xl font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Concluir <Check className="w-5 h-5" /></>}
                    </button>
                </div>
            </div>
        </div>
    )
}
