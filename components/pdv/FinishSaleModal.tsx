import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Loader2, Users, Info, Banknote, CreditCard, QrCode, Plus, Trash2 } from 'lucide-react'
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

/** One form of payment in the sale. `amount` is typed text (dot as decimal separator). */
interface PaymentRow {
    id: string
    methodId: string
    amount: string
}

const round2 = (n: number) => Math.round(n * 100) / 100
const toNumber = (s: string) => parseFloat(s) || 0
const toText = (n: number) => (n > 0 ? round2(n).toFixed(2) : '0')

function isCashMethod(pm?: PaymentMethodModel) {
    const code = pm?.code?.toLowerCase() || ''
    return code === 'money' || code === 'cash' || code === 'dinheiro'
}

let rowSeq = 0
const newRowId = () => `row-${++rowSeq}`

export default function FinishSaleModal({ isOpen, setIsOpen, total, discount, finalAmount }: FinishSaleModalProps) {
    const { cart, clearCart, paymentMethod } = usePDVStore()
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingInit, setLoadingInit] = useState(true)
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodModel[]>([])
    const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])

    // Form state
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [notes, setNotes] = useState('')
    const [rows, setRows] = useState<PaymentRow[]>([])
    const [activeRowId, setActiveRowId] = useState('')
    /** First keypad press replaces the amount instead of appending to it. */
    const [isFirstInput, setIsFirstInput] = useState(true)

    const methodById = useCallback((id: string) => paymentMethods.find(p => p.id === id), [paymentMethods])
    const rowIsCash = useCallback((row: PaymentRow) => isCashMethod(methodById(row.methodId)), [methodById])

    // ----- totals -----
    const summary = useMemo(() => {
        const nonCash = round2(rows.filter(r => !rowIsCash(r)).reduce((s, r) => s + toNumber(r.amount), 0))
        let cash = round2(rows.filter(r => rowIsCash(r)).reduce((s, r) => s + toNumber(r.amount), 0))
        // A single cash payment with nothing typed means "exact amount, no change".
        const onlyCashUntyped = rows.length > 0 && rows.every(r => rowIsCash(r)) && cash === 0
        if (onlyCashUntyped) cash = finalAmount
        const paid = round2(nonCash + cash)
        const overNonCash = nonCash > finalAmount + 0.009
        const missing = Math.max(0, round2(finalAmount - paid))
        const change = overNonCash ? 0 : Math.max(0, round2(paid - finalAmount))
        return { nonCash, cash, paid, missing, change, overNonCash, onlyCashUntyped }
    }, [rows, rowIsCash, finalAmount])

    const activeRow = rows.find(r => r.id === activeRowId) ?? rows[0]

    useEffect(() => {
         
        setMounted(true)
        if (isOpen) initData()
    // Only run on open, don't reset when the total changes while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const initData = async () => {
        setLoadingInit(true)
        try {
            const [pmRes, crRes, custRes] = await Promise.all([
                fetch('/api/payment-methods', { cache: 'no-store' }),
                fetch('/api/cash-registers/current', { cache: 'no-store' }),
                fetch('/api/customers', { cache: 'no-store' })
            ])

            const [pmRaw, crData, custData] = await Promise.all([pmRes.json(), crRes.json(), custRes.json()])
            // Most used first, so the common choices are visible without scrolling.
            const ORDER = ['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD']
            const rank = (pm: PaymentMethodModel) => {
                const i = ORDER.indexOf((pm.code || '').toUpperCase())
                return i === -1 ? ORDER.length : i
            }
            const pmData: PaymentMethodModel[] = Array.isArray(pmRaw) ? [...pmRaw].sort((a, b) => rank(a) - rank(b)) : []

            setPaymentMethods(pmData)
            setCashRegister(crData)
            setCustomers(custData.data || [])

            let matchedId = pmData[0]?.id || ''
            if (paymentMethod && pmData.length > 0) {
                const matched = pmData.find((pm: PaymentMethodModel) => {
                    const code = pm.code?.toLowerCase() || ''
                    const name = pm.name?.toLowerCase() || ''
                    if (paymentMethod === 'dinheiro') {
                        return code === 'money' || code === 'cash' || code === 'dinheiro' ||
                            name.includes('dinheiro') || name.includes('money') || name.includes('cash')
                    }
                    if (paymentMethod === 'pix') return code === 'pix' || name.includes('pix')
                    if (paymentMethod === 'cartao') {
                        return code.includes('card') || code.includes('cartao') || code.includes('credit') || code.includes('debit') ||
                            name.includes('cartao') || name.includes('cartão') || name.includes('credito') || name.includes('crédito') || name.includes('debito') || name.includes('débito')
                    }
                    return false
                })
                if (matched) matchedId = matched.id
            }

            // Cash starts at 0 (type what the customer handed over); other methods start at the total.
            const firstIsCash = isCashMethod(pmData.find((p: PaymentMethodModel) => p.id === matchedId))
            const first: PaymentRow = { id: newRowId(), methodId: matchedId, amount: firstIsCash ? '0' : toText(finalAmount) }
            setRows([first])
            setActiveRowId(first.id)
            setIsFirstInput(true)
        } catch (error) {
            console.error('Error initializing finish sale modal:', error)
            toast.error('Erro ao carregar dados de checkout.')
        } finally {
            setLoadingInit(false)
        }
    }

    // ----- row editing -----
    const updateRow = (id: string, patch: Partial<PaymentRow>) => {
        setRows(list => list.map(r => (r.id === id ? { ...r, ...patch } : r)))
    }

    const selectMethod = (row: PaymentRow, methodId: string) => {
        const nowCash = isCashMethod(methodById(methodId))
        // Switching a lone row to cash clears it so the keypad can take the amount received.
        const amount = rows.length === 1 ? (nowCash ? '0' : toText(finalAmount)) : row.amount
        updateRow(row.id, { methodId, amount })
        setActiveRowId(row.id)
        setIsFirstInput(true)
    }

    const addRow = () => {
        // The new row picks a method not used yet (cash first) and takes what is still missing.
        const used = new Set(rows.map(r => r.methodId))
        const cash = paymentMethods.find(p => isCashMethod(p) && !used.has(p.id))
        const other = paymentMethods.find(p => !used.has(p.id))
        const method = cash ?? other ?? paymentMethods[0]
        // When the first row was an untouched cash row, give it the whole remaining so the split starts sensibly.
        const base = rows.map(r => (rowIsCash(r) && toNumber(r.amount) === 0 && rows.length === 1 ? { ...r, amount: '0' } : r))
        const paidSoFar = round2(base.reduce((s, r) => s + toNumber(r.amount), 0))
        const remaining = Math.max(0, round2(finalAmount - paidSoFar))
        const row: PaymentRow = { id: newRowId(), methodId: method?.id || '', amount: toText(remaining) }
        setRows([...base, row])
        setActiveRowId(row.id)
        setIsFirstInput(true)
    }

    const removeRow = (id: string) => {
        const next = rows.filter(r => r.id !== id)
        setRows(next)
        if (activeRowId === id) setActiveRowId(next[0]?.id ?? '')
        setIsFirstInput(true)
    }

    const fillRemaining = (row: PaymentRow) => {
        const others = round2(rows.filter(r => r.id !== row.id).reduce((s, r) => s + toNumber(r.amount), 0))
        updateRow(row.id, { amount: toText(Math.max(0, finalAmount - others)) })
        setActiveRowId(row.id)
        setIsFirstInput(true)
    }

    const handleKeypadPress = useCallback((val: string) => {
        if (!activeRow) return
        const current = activeRow.amount
        let next = current
        if (val === 'C') {
            next = '0'
            setIsFirstInput(true)
        } else if (val === '⌫') {
            next = current.length <= 1 ? '0' : current.slice(0, -1)
            setIsFirstInput(false)
        } else if (isFirstInput) {
            next = val === '.' ? '0.' : val
            setIsFirstInput(false)
        } else if (val === '.' && current.includes('.')) {
            return
        } else if (current.includes('.') && current.split('.')[1].length >= 2) {
            return
        } else {
            next = current === '0' && val !== '.' ? val : current + val
        }
        updateRow(activeRow.id, { amount: next })
    }, [activeRow, isFirstInput])

    const quickCash = (value: number) => {
        if (!activeRow) return
        updateRow(activeRow.id, { amount: toText(value) })
        setIsFirstInput(true)
    }

    // ----- finish -----
    const canFinish = !!cashRegister && rows.length > 0 && rows.every(r => r.methodId) && summary.missing <= 0.009 && !summary.overNonCash

    const handleFinish = useCallback(async () => {
        if (!cashRegister) {
            toast.error('É necessário um caixa aberto para finalizar a venda.')
            return
        }
        if (rows.some(r => !r.methodId)) {
            toast.error('Selecione a forma de pagamento.')
            return
        }
        if (summary.overNonCash) {
            toast.error('O valor em cartão/PIX passou do total. Só dinheiro pode ter troco.')
            return
        }
        if (summary.missing > 0.009) {
            toast.error(`Faltam ${formatCurrency(summary.missing)} para completar o pagamento.`)
            return
        }

        // Payments as sent to the server; an untouched lone cash row means exact amount.
        const payments = rows
            .map(r => ({
                payment_method_id: r.methodId,
                amount: summary.onlyCashUntyped ? round2(finalAmount) : round2(toNumber(r.amount)),
            }))
            .filter(p => p.amount > 0)

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
                payment_method_id: rows[0].methodId,
                payments: payments.length ? payments : undefined,
                notes,
            }

            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erro ao processar venda')

            toast.success('Venda finalizada', {
                description: summary.change > 0 ? `Troco: ${formatCurrency(summary.change)}` : undefined,
            })
            clearCart()
            setIsOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao processar venda')
        } finally {
            setLoading(false)
        }
    }, [cashRegister, rows, summary, finalAmount, selectedCustomer, cart, total, discount, notes, clearCart, setIsOpen])

    // Keyboard support: digits edit the selected payment, Enter confirms, Esc closes.
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
            if (e.key >= '0' && e.key <= '9') handleKeypadPress(e.key)
            if (e.key === '.' || e.key === ',') handleKeypadPress('.')
            if (e.key === 'Backspace') handleKeypadPress('⌫')
            if (e.key === 'Escape') setIsOpen(false)
            if (e.key === 'Enter') handleFinish()
            if (e.key === 'c' || e.key === 'C') handleKeypadPress('C')
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, handleKeypadPress, handleFinish, setIsOpen])

    if (!isOpen || !mounted) return null

    const getPMIcon = (code: string) => {
        switch (code?.toLowerCase()) {
            case 'money': case 'cash': case 'dinheiro': return <Banknote className="w-4 h-4" />
            case 'pix': return <QrCode className="w-4 h-4" />
            default: return <CreditCard className="w-4 h-4" />
        }
    }

    const activeIsCash = activeRow ? rowIsCash(activeRow) : false
    // Cash shortcuts: the exact amount this payment must cover, then common notes above it.
    const activeDue = activeRow
        ? Math.max(0, round2(finalAmount - rows.filter(r => r.id !== activeRow.id).reduce((sum, r) => sum + toNumber(r.amount), 0)))
        : 0
    const quickValues = activeIsCash && activeDue > 0
        ? Array.from(new Set([Math.ceil(activeDue), ...[10, 20, 50, 100, 200].filter(v => v > activeDue)])).slice(0, 4)
        : []

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-4 bg-black/40 animate-in fade-in duration-200"
            onMouseDown={e => { if (e.target === e.currentTarget) setIsOpen(false) }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Finalizar venda"
                className="bg-card w-full max-w-[1000px] rounded-t-3xl md:rounded-3xl border border-border/60 shadow-2xl overflow-hidden animate-sheet-up flex flex-col md:flex-row max-h-[94dvh]"
            >
                {/* Left: customer, payment forms, notes */}
                <div className="flex-1 p-5 md:p-8 space-y-6 overflow-y-auto">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="type-title2 text-foreground">Finalizar venda</h2>
                            <p className="text-[13px] text-muted-foreground mt-0.5">{cart.length} {cart.length === 1 ? 'item' : 'itens'} · {formatCurrency(finalAmount)}</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            aria-label="Fechar (Esc)"
                            className="md:hidden w-9 h-9 rounded-full bg-foreground/[0.07] flex items-center justify-center text-muted-foreground"
                        >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                    </div>

                    {loadingInit ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-[15px] text-muted-foreground">Carregando…</p>
                        </div>
                    ) : (
                        <>
                            {!cashRegister && (
                                <div className="p-4 rounded-2xl bg-red-500/10 flex items-start gap-3">
                                    <Info className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[15px] font-semibold text-red-600 dark:text-red-400">Caixa fechado</p>
                                        <p className="text-[13px] text-red-600/80 dark:text-red-400/80">Abra o caixa antes de finalizar a venda.</p>
                                    </div>
                                </div>
                            )}

                            {/* Customer */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground px-1">
                                    <Users className="w-4 h-4" /> Cliente
                                </label>
                                <CustomerAutocomplete
                                    customers={customers}
                                    selectedId={selectedCustomer}
                                    onSelect={setSelectedCustomer}
                                    placeholder="Consumidor Final"
                                />
                            </div>

                            {/* Payment forms */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[13px] font-medium text-muted-foreground">Pagamento</p>
                                    {rows.length > 1 && <p className="text-[13px] text-muted-foreground">{rows.length} formas</p>}
                                </div>

                                {rows.map((row, idx) => {
                                    const cash = rowIsCash(row)
                                    const active = row.id === activeRow?.id
                                    return (
                                        <div
                                            key={row.id}
                                            onClick={() => { setActiveRowId(row.id); setIsFirstInput(true) }}
                                            className={cn(
                                                'rounded-2xl border p-3 space-y-3 transition-colors cursor-pointer',
                                                active ? 'border-primary bg-primary/[0.04]' : 'border-border/70'
                                            )}
                                        >
                                            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                                                {paymentMethods.map(pm => (
                                                    <button
                                                        key={pm.id}
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); selectMethod(row, pm.id) }}
                                                        aria-pressed={row.methodId === pm.id}
                                                        className={cn(
                                                            'h-10 px-3 rounded-full text-[14px] font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors',
                                                            row.methodId === pm.id ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.05] text-foreground hover:bg-foreground/[0.09]'
                                                        )}
                                                    >
                                                        {getPMIcon(pm.code)}
                                                        {pm.name}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] text-muted-foreground w-16 sm:w-20 shrink-0">
                                                    {cash ? 'Recebido' : 'Valor'}
                                                </span>
                                                <div className="flex-1 min-w-0 flex items-center h-11 px-3 rounded-xl bg-foreground/[0.05]">
                                                    <span className="text-muted-foreground text-[15px] mr-1">R$</span>
                                                    <input
                                                        inputMode="decimal"
                                                        value={row.amount.replace('.', ',')}
                                                        onFocus={() => { setActiveRowId(row.id); setIsFirstInput(true) }}
                                                        onChange={e => {
                                                            const v = e.target.value.replace(/[^\d,.]/g, '').replace(',', '.')
                                                            if ((v.match(/\./g) || []).length > 1) return
                                                            updateRow(row.id, { amount: v || '0' })
                                                            setIsFirstInput(false)
                                                        }}
                                                        aria-label={`Valor em ${methodById(row.methodId)?.name || 'pagamento'} ${idx + 1}`}
                                                        className="flex-1 min-w-0 bg-transparent text-[17px] font-semibold tabular-nums focus:outline-none"
                                                    />
                                                </div>
                                                {rows.length > 1 && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={e => { e.stopPropagation(); fillRemaining(row) }}
                                                            className="h-11 px-3 rounded-xl text-[13px] font-medium text-primary hover:bg-primary/10 shrink-0"
                                                        >
                                                            Restante
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={e => { e.stopPropagation(); removeRow(row.id) }}
                                                            aria-label="Remover forma de pagamento"
                                                            className="w-11 h-11 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10 shrink-0"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            {cash && rows.length === 1 && (
                                                <p className="text-[13px] text-muted-foreground px-1">
                                                    Digite quanto o cliente entregou para calcular o troco. Deixe em 0 se for o valor exato.
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}

                                {rows.length < 4 && paymentMethods.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={addRow}
                                        className="w-full h-12 rounded-2xl border border-dashed border-border text-[15px] font-medium text-primary inline-flex items-center justify-center gap-2 hover:border-primary/50"
                                    >
                                        <Plus className="w-4 h-4" /> Dividir pagamento
                                        <span className="hidden sm:inline text-muted-foreground font-normal">· parte no cartão, parte em dinheiro</span>
                                    </button>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground px-1" htmlFor="sale-notes">Observações internas</label>
                                <textarea
                                    id="sale-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-3.5 rounded-xl bg-foreground/[0.05] text-[15px] outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-none placeholder:text-muted-foreground"
                                    placeholder="Notas sobre a venda…"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Right: totals, change and keypad */}
                <div className="w-full md:w-[380px] bg-foreground/[0.03] md:border-l border-t md:border-t-0 border-border/60 p-5 md:p-8 flex flex-col gap-5 relative">
                    <button
                        onClick={() => setIsOpen(false)}
                        aria-label="Fechar (Esc)"
                        className="hidden md:flex absolute top-5 right-5 w-9 h-9 rounded-full bg-foreground/[0.07] hover:bg-foreground/[0.12] items-center justify-center text-muted-foreground"
                    >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>

                    <div className="space-y-3">
                        <div>
                            <p className="text-[13px] text-muted-foreground">Total da venda</p>
                            <p className="type-large-title text-foreground tabular-nums">{formatCurrency(finalAmount)}</p>
                        </div>
                        <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                            <div className="flex justify-between items-center px-4 h-11">
                                <span className="text-[15px] text-muted-foreground">Pago</span>
                                <span className="text-[15px] font-semibold tabular-nums">{formatCurrency(summary.paid)}</span>
                            </div>
                            {summary.overNonCash ? (
                                <div className="px-4 py-2.5 text-[13px] text-red-600 dark:text-red-400">
                                    Cartão/PIX passou do total. Só dinheiro pode gerar troco.
                                </div>
                            ) : summary.missing > 0.009 ? (
                                <div className="flex justify-between items-center px-4 h-12">
                                    <span className="text-[15px] font-medium text-orange-600 dark:text-orange-400">Falta</span>
                                    <span className="text-[20px] font-bold text-orange-600 dark:text-orange-400 tabular-nums">{formatCurrency(summary.missing)}</span>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center px-4 h-12">
                                    <span className="text-[15px] font-medium text-green-700 dark:text-green-400">Troco</span>
                                    <span className="text-[22px] font-bold text-green-700 dark:text-green-400 tabular-nums">{formatCurrency(summary.change)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {activeRow && (
                        <div className="space-y-2">
                            <p className="text-[13px] text-muted-foreground">
                                Editando: <span className="font-medium text-foreground">{methodById(activeRow.methodId)?.name || 'pagamento'}</span>
                            </p>
                            {quickValues.length > 0 && (
                                <div className="flex gap-2">
                                    {quickValues.map(v => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => quickCash(v)}
                                            className="flex-1 h-10 rounded-xl bg-card border border-border/60 text-[14px] font-semibold tabular-nums hover:border-primary/50"
                                        >
                                            R$ {v}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleKeypadPress(key)}
                                        aria-label={key === 'C' ? 'Limpar' : key === '⌫' ? 'Apagar' : key}
                                        className={cn(
                                            'h-12 md:h-14 rounded-xl bg-card border border-border/60 active:bg-foreground/[0.08] text-[20px] font-medium tabular-nums',
                                            key === 'C' && 'text-red-600 dark:text-red-400 text-[17px]',
                                            key === '⌫' && 'text-muted-foreground'
                                        )}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleFinish}
                        disabled={loading || loadingInit || !canFinish}
                        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-[17px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2 mt-auto"
                        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                {summary.change > 0 ? `Confirmar · troco ${formatCurrency(summary.change)}` : 'Confirmar pagamento'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
