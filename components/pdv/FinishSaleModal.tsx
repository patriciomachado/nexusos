import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Loader2, Wallet, Users, Info, Banknote, CreditCard, QrCode } from 'lucide-react'
import { usePDVStore } from '@/store/usePDVStore'
import { formatCurrency, cn } from '@/lib/utils'
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
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingInit, setLoadingInit] = useState(true)
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodModel[]>([])
    const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])

    // Form State
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [notes, setNotes] = useState('')
    const [amountReceived, setAmountReceived] = useState('')

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            initData()
            setAmountReceived(finalAmount.toString())
        }
    }, [isOpen, finalAmount])

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

    const handleKeypadPress = (val: string) => {
        if (val === 'C') {
            setAmountReceived('')
            return
        }
        if (val === '⌫') {
            setAmountReceived(prev => prev.slice(0, -1))
            return
        }
        if (val === '.' && amountReceived.includes('.')) return
        setAmountReceived(prev => prev + val)
    }

    const calculateChange = () => {
        const received = parseFloat(amountReceived) || 0
        return Math.max(0, received - finalAmount)
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
                notes,
                amount_received: parseFloat(amountReceived) || finalAmount
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

    if (!isOpen || !mounted) return null

    const getPMIcon = (code: string) => {
        switch (code?.toLowerCase()) {
            case 'money': case 'cash': case 'dinheiro': return <Banknote className="w-5 h-5" />
            case 'pix': return <QrCode className="w-5 h-5" />
            default: return <CreditCard className="w-5 h-5" />
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/40 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-card/80 backdrop-blur-3xl border border-white/10 w-full max-w-[1000px] rounded-[3rem] shadow-[0_32px_128px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col md:flex-row h-[90vh] md:h-auto">

                {/* Left Panel: Sale Summary & Form */}
                <div className="flex-1 p-8 md:p-12 space-y-8 overflow-y-auto">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter">Finalizar Venda</h2>
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">Ambiente Seguro Nexus</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-4 rounded-[1.5rem] bg-muted/50 hover:bg-muted transition-all md:hidden">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {loadingInit ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
                            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Iniciando Checkout...</p>
                        </div>
                    ) : (
                        <>
                            {!cashRegister && (
                                <div className="p-6 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-start gap-4 animate-in slide-in-from-top-4">
                                    <Info className="w-6 h-6 text-rose-500 mt-1" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-rose-500 uppercase tracking-tight">Caixa Fechado!</p>
                                        <p className="text-xs text-rose-500/70 font-medium">Abra o caixa antes de continuar.</p>
                                    </div>
                                </div>
                            )}

                            {/* Customer */}
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
                                    <Users className="w-4 h-4" /> Cliente
                                </label>
                                <CustomerAutocomplete
                                    customers={customers}
                                    selectedId={selectedCustomer}
                                    onSelect={setSelectedCustomer}
                                    placeholder="Consumidor Final"
                                />
                            </div>

                            {/* Payment Methods */}
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
                                    <Wallet className="w-4 h-4" /> Forma de Pagamento
                                </label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paymentMethods.map(pm => (
                                        <button
                                            key={pm.id}
                                            onClick={() => setSelectedPaymentMethod(pm.id)}
                                            className={cn(
                                                "p-6 rounded-[2rem] border-2 transition-all flex flex-col gap-4 text-left group relative overflow-hidden",
                                                selectedPaymentMethod === pm.id
                                                    ? 'bg-primary border-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.02]'
                                                    : 'bg-muted/40 border-transparent hover:border-white/10'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                selectedPaymentMethod === pm.id ? 'bg-white/20' : 'bg-muted'
                                            )}>
                                                {getPMIcon(pm.code)}
                                            </div>
                                            <span className="font-black text-sm uppercase tracking-tight">{pm.name}</span>
                                            {selectedPaymentMethod === pm.id && <Check className="absolute top-6 right-6 w-5 h-5" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Observações Internas</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-6 rounded-[2rem] bg-muted/40 border-none text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 min-h-[120px] resize-none transition-all placeholder:opacity-30"
                                    placeholder="Notas sobre a venda..."
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Right Panel: Numeric Keypad & Totals (Indigo Vibrante) */}
                <div className="w-full md:w-[420px] bg-gradient-to-br from-indigo-600 to-blue-700 p-8 md:p-12 flex flex-col justify-between text-white relative">
                    <button onClick={() => setIsOpen(false)} className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-white/10 transition-all hidden md:block">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="space-y-10">
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Total da Venda</p>
                                <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(finalAmount)}</h3>
                            </div>

                            <div className="bg-white/10 rounded-[2rem] p-6 space-y-4 border border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Valor Recebido</p>
                                    <div className="text-4xl font-black tracking-tighter flex items-baseline gap-2">
                                        <span className="text-lg opacity-40">R$</span>
                                        {amountReceived || '0,00'}
                                    </div>
                                </div>
                                {calculateChange() > 0 && (
                                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Troco</p>
                                        <p className="text-2xl font-black text-emerald-300 tracking-tighter">{formatCurrency(calculateChange())}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Numeric Keypad */}
                        <div className="grid grid-cols-3 gap-3 pt-6">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(key => (
                                <button
                                    key={key}
                                    onClick={() => handleKeypadPress(key)}
                                    className="h-16 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-90 transition-all font-black text-lg border border-white/5 backdrop-blur-md"
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-10">
                        <button
                            onClick={handleFinish}
                            disabled={loading || !cashRegister}
                            className="w-full h-20 md:h-24 rounded-[2.5rem] bg-white text-indigo-700 font-black uppercase text-base tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-indigo-900/40 disabled:opacity-50 flex items-center justify-center gap-4 group"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    Confirmar Pagamento
                                    <Check className="w-6 h-6 group-hover:scale-125 transition-transform" />
                                </>
                            )}
                        </button>
                        <p className="text-[9px] font-bold text-center mt-6 uppercase tracking-[0.2em] opacity-40">Processado por Nexus OS v2.0</p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

