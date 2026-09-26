'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, ChevronRight, History, Loader2, Minus, Plus, Printer, ScanLine, Search, ShoppingBag, Star, Trash2, Undo2, UserRound, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Sheet from '@/components/tasks/Sheet'
import Segmented from '@/components/ui/Segmented'
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal'
import CustomerPicker from '@/components/os/form/CustomerPicker'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, TextInput, brl, parseMoney } from '@/components/ui/form'
import { cn } from '@/lib/utils'

/**
 * PDV: find (or scan) products, one-tap best sellers, a cart that is always
 * at hand, mixed payments with change and card installments, receipt on
 * WhatsApp or printed, and returns.
 */

interface Product {
    id: string
    name: string
    selling_price: number | string
    cost_price?: number | string | null
    quantity_in_stock: number | string
    unit?: string | null
    barcode?: string | null
    sku?: string | null
    category?: string | null
}
interface Line { product: Product; qty: number }
interface Method { id: string; name: string; code: string }
interface PayRow { key: number; methodId: string; amount: string; installments: number }
interface Settings { fees: { debit: { rate: number }; credit: { rate: number }; credit_installments: { rate: number }; pix: { rate: number } }; max_discount_pct: number; has_pin: boolean }
interface SaleItem { id: string; item_name: string; quantity: number; unit_price: number; total_price: number; returned_quantity?: number | null }
interface Sale { id: string; created_at: string; final_amount: number; discount_amount: number; status: string; customers: { name?: string; phone?: string } | null; users: { full_name?: string } | null; sale_items: SaleItem[] }

const num = (v: unknown) => Number(v) || 0
const round2 = (n: number) => Math.round(n * 100) / 100
const ORDER = ['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD']
const code = (id: string) => `#${id.slice(0, 4).toUpperCase()}`

export default function PdvClient({ companyId, role }: { companyId: string; role: string }) {
    const owner = ['admin', 'owner'].includes(role)
    const [query, setQuery] = useState('')
    const [products, setProducts] = useState<Product[]>([])
    const [favorites, setFavorites] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [cart, setCart] = useState<Line[]>([])
    const [discount, setDiscount] = useState('')
    const [discountMode, setDiscountMode] = useState<'brl' | 'pct'>('brl')
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
    const [customerId, setCustomerId] = useState('')
    const [methods, setMethods] = useState<Method[]>([])
    const [settings, setSettings] = useState<Settings | null>(null)
    const [hasRegister, setHasRegister] = useState<boolean | null>(null)
    const [scanning, setScanning] = useState(false)
    const [cartOpen, setCartOpen] = useState(false)
    const [checkout, setCheckout] = useState(false)
    const [done, setDone] = useState<{ id: string; change: number; total: number; phone?: string | null } | null>(null)
    const [historyOpen, setHistoryOpen] = useState(false)

    // Search (debounced); empty search lists the first products.
    useEffect(() => {
        const h = setTimeout(() => {
            fetch(`/api/inventory${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`)
                .then(r => r.json())
                .then(d => setProducts(Array.isArray(d.data) ? d.data.filter((p: Product & { is_active?: boolean }) => p.is_active !== false) : []))
                .catch(() => {})
                .finally(() => setLoading(false))
        }, query ? 250 : 0)
        return () => clearTimeout(h)
    }, [query])

    const loadRegister = useCallback(() => {
        fetch('/api/cash-registers/current', { cache: 'no-store' }).then(r => r.json()).then(d => setHasRegister(!!d?.id)).catch(() => setHasRegister(false))
    }, [])

    useEffect(() => {
        fetch('/api/pdv/favorites').then(r => r.json()).then(d => setFavorites(Array.isArray(d.data) ? d.data : [])).catch(() => {})
        fetch('/api/payment-methods').then(r => r.json()).then((d: Method[]) => {
            if (!Array.isArray(d)) return
            const rank = (m: Method) => { const i = ORDER.indexOf((m.code || '').toUpperCase()); return i < 0 ? 99 : i }
            setMethods([...d].sort((a, b) => rank(a) - rank(b)))
        }).catch(() => {})
        fetch('/api/cash-settings').then(r => r.json()).then(d => d?.fees && setSettings(d)).catch(() => {})
        fetch('/api/customers').then(r => r.json()).then(d => setCustomers(Array.isArray(d.data) ? d.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : [])).catch(() => {})
        loadRegister()
    }, [loadRegister])

    const qtyOf = (id: string) => cart.find(l => l.product.id === id)?.qty ?? 0
    const add = (p: Product) => {
        const inCart = qtyOf(p.id)
        if (num(p.quantity_in_stock) <= inCart) toast.warning(`${p.name}: sem estoque suficiente (${num(p.quantity_in_stock)})`)
        setCart(c => c.some(l => l.product.id === p.id) ? c.map(l => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l) : [...c, { product: p, qty: 1 }])
    }
    const setQty = (id: string, qty: number) => setCart(c => qty <= 0 ? c.filter(l => l.product.id !== id) : c.map(l => l.product.id === id ? { ...l, qty } : l))

    const subtotal = round2(cart.reduce((s, l) => s + l.qty * num(l.product.selling_price), 0))
    const discountValue = useMemo(() => {
        const v = parseMoney(discount)
        return round2(Math.min(subtotal, discountMode === 'pct' ? subtotal * Math.min(v, 100) / 100 : v))
    }, [discount, discountMode, subtotal])
    const total = round2(Math.max(0, subtotal - discountValue))
    const items = cart.reduce((s, l) => s + l.qty, 0)
    const discountPct = subtotal > 0 ? (discountValue / subtotal) * 100 : 0
    const discountNeedsPin = !owner && !!settings && settings.max_discount_pct > 0 && discountPct > settings.max_discount_pct + 0.001

    const onScan = async (value: string) => {
        setScanning(false)
        try {
            const d = await fetch(`/api/inventory?search=${encodeURIComponent(value)}`).then(r => r.json())
            const list: Product[] = d.data ?? []
            const hit = list.find(p => p.barcode === value || p.sku === value) ?? (list.length === 1 ? list[0] : null)
            if (hit) { add(hit); toast.success(`Adicionado: ${hit.name}`) }
            else { setQuery(value); toast.message(`Nada com o código ${value}`) }
        } catch { setQuery(value) }
    }

    const clearSale = () => { setCart([]); setDiscount(''); setCustomerId(''); setCheckout(false); setCartOpen(false) }

    const cartPanel = (
        <CartPanel
            cart={cart}
            setQty={setQty}
            subtotal={subtotal}
            discount={discount}
            setDiscount={setDiscount}
            discountMode={discountMode}
            setDiscountMode={setDiscountMode}
            discountValue={discountValue}
            discountNeedsPin={discountNeedsPin}
            maxPct={settings?.max_discount_pct ?? 0}
            total={total}
            customers={customers}
            setCustomers={setCustomers}
            customerId={customerId}
            setCustomerId={setCustomerId}
            companyId={companyId}
            onCheckout={() => { if (!cart.length) return; setCartOpen(false); setCheckout(true) }}
            onClear={() => setCart([])}
            disabled={hasRegister === false}
        />
    )

    return (
        <div className="min-h-full bg-background">
            <Header title="Vender" />
            <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6 lg:items-start">
                <div className="space-y-4 min-w-0 pb-4">
                    {hasRegister === false && (
                        <Link href="/cash-register" className="flex items-center gap-3 rounded-2xl bg-orange-500/10 text-orange-800 dark:text-orange-300 px-4 py-3">
                            <span className="flex-1 text-[15px] font-medium">Abra o caixa para poder vender</span>
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    )}

                    <div className="flex items-center gap-2">
                        <label className="flex-1 min-w-0 flex items-center gap-2 h-12 px-3 rounded-xl bg-foreground/[0.06] focus-within:ring-2 focus-within:ring-primary/40">
                            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Produto, código ou SKU" className="flex-1 min-w-0 bg-transparent text-[17px] outline-none" />
                            {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar"><X className="w-4 h-4 text-muted-foreground" /></button>}
                        </label>
                        <button type="button" onClick={() => setScanning(true)} aria-label="Ler código de barras" className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><ScanLine className="w-6 h-6" /></button>
                        <button type="button" onClick={() => setHistoryOpen(true)} aria-label="Vendas recentes" className="w-12 h-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center shrink-0"><History className="w-5 h-5" /></button>
                    </div>

                    {!query && favorites.length > 0 && (
                        <section className="space-y-2">
                            <h2 className="px-1 text-[13px] font-medium text-muted-foreground flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Mais vendidos</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {favorites.map(p => (
                                    <button key={p.id} type="button" onClick={() => add(p)} className="relative rounded-2xl bg-card border border-border/60 p-3 text-left active:scale-[0.98] transition-transform min-h-[76px]">
                                        <span className="block text-[15px] font-medium leading-snug line-clamp-2">{p.name}</span>
                                        <span className="block mt-1 text-[15px] font-semibold tabular-nums text-primary">{brl(num(p.selling_price))}</span>
                                        {qtyOf(p.id) > 0 && <span className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center">{qtyOf(p.id)}</span>}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="space-y-2">
                        {!query && <h2 className="px-1 text-[13px] font-medium text-muted-foreground">Produtos</h2>}
                        <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                            {loading ? <li className="h-40 animate-pulse" /> : products.length ? products.slice(0, 80).map(p => {
                                const stock = num(p.quantity_in_stock)
                                const q = qtyOf(p.id)
                                return (
                                    <li key={p.id}>
                                        <button type="button" onClick={() => add(p)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.04]">
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[16px] font-medium truncate">{p.name}</span>
                                                <span className={cn('block text-[13px]', stock <= 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{stock <= 0 ? 'Sem estoque' : `${stock} em estoque`}{p.category ? ` · ${p.category}` : ''}</span>
                                            </span>
                                            <span className="text-[16px] font-semibold tabular-nums">{brl(num(p.selling_price))}</span>
                                            <span className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold', q ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>{q || <Plus className="w-4 h-4" />}</span>
                                        </button>
                                    </li>
                                )
                            }) : (
                                <li className="px-4 py-8 text-center text-[15px] text-muted-foreground">{query ? 'Nenhum produto encontrado.' : 'Cadastre produtos em Produtos para vender aqui.'}</li>
                            )}
                        </ul>
                    </section>
                    {/* Room for the cart bar on phones */}
                    <div className="lg:hidden h-[calc(6rem+env(safe-area-inset-bottom))]" aria-hidden />
                </div>

                <aside className="hidden lg:block sticky top-4 rounded-2xl bg-card border border-border/60 overflow-hidden">
                    {cartPanel}
                </aside>
            </div>

            {/* Phones: cart bar */}
            {items > 0 && !cartOpen && !checkout && (
                <div className="lg:hidden fixed inset-x-0 bottom-0 ios-fill z-40 material-bar border-t border-border/60" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                    <div className="px-4 pt-3 flex items-center gap-3">
                        <button type="button" onClick={() => setCartOpen(true)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                            <span className="relative w-11 h-11 rounded-full bg-foreground/[0.07] flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center">{items}</span>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[13px] text-muted-foreground">Ver carrinho</span>
                                <span className="block text-[20px] font-semibold tabular-nums leading-tight">{brl(total)}</span>
                            </span>
                        </button>
                        <PrimaryButton onClick={() => setCheckout(true)} disabled={hasRegister === false}>Cobrar</PrimaryButton>
                    </div>
                </div>
            )}

            <Sheet open={cartOpen} onClose={() => setCartOpen(false)} title={`Carrinho · ${items} ${items === 1 ? 'item' : 'itens'}`} full>
                {cartPanel}
            </Sheet>

            {checkout && (
                <CheckoutSheet
                    total={total}
                    subtotal={subtotal}
                    discountValue={discountValue}
                    discountNeedsPin={discountNeedsPin}
                    cart={cart}
                    customerId={customerId}
                    methods={methods}
                    settings={settings}
                    onClose={() => setCheckout(false)}
                    onDone={(res) => {
                        setDone({ ...res, phone: null })
                        clearSale()
                        loadRegister()
                        setQuery(q => q) // keep the list
                    }}
                />
            )}

            {done && (
                <Sheet open onClose={() => setDone(null)} title="Venda concluída" footer={<PrimaryButton className="w-full" onClick={() => setDone(null)}>Nova venda</PrimaryButton>}>
                    <div className="py-2 flex flex-col items-center text-center gap-2">
                        <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                        <p className="text-[28px] font-semibold tabular-nums">{brl(done.total)}</p>
                        {done.change > 0 && <p className="text-[17px]">Troco: <strong className="tabular-nums">{brl(done.change)}</strong></p>}
                        <ReceiptActions saleId={done.id} />
                    </div>
                </Sheet>
            )}

            {historyOpen && <SalesHistory onClose={() => setHistoryOpen(false)} methods={methods} />}

            <BarcodeScannerModal isOpen={scanning} onClose={() => setScanning(false)} onScan={onScan} title="Ler código do produto" />
        </div>
    )
}

/* ─────────────────────────────── Cart ─────────────────────────────── */

function CartPanel(p: {
    cart: Line[]
    setQty: (id: string, q: number) => void
    subtotal: number
    discount: string
    setDiscount: (v: string) => void
    discountMode: 'brl' | 'pct'
    setDiscountMode: (v: 'brl' | 'pct') => void
    discountValue: number
    discountNeedsPin: boolean
    maxPct: number
    total: number
    customers: { id: string; name: string }[]
    setCustomers: (c: { id: string; name: string }[]) => void
    customerId: string
    setCustomerId: (id: string) => void
    companyId: string
    onCheckout: () => void
    onClear: () => void
    disabled: boolean
}) {
    if (!p.cart.length) {
        return (
            <div className="px-4 py-12 text-center text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-[15px]">Toque nos produtos para adicionar.</p>
            </div>
        )
    }
    return (
        <div className="flex flex-col">
            <ul className="divide-y divide-border/60">
                {p.cart.map(l => (
                    <li key={l.product.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex-1 min-w-0">
                            <span className="block text-[15px] font-medium truncate">{l.product.name}</span>
                            <span className="block text-[13px] text-muted-foreground tabular-nums">{brl(num(l.product.selling_price))} · {brl(l.qty * num(l.product.selling_price))}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => p.setQty(l.product.id, l.qty - 1)} aria-label="Menos" className="w-8 h-8 rounded-full bg-foreground/[0.07] flex items-center justify-center">{l.qty === 1 ? <Trash2 className="w-4 h-4 text-red-600" /> : <Minus className="w-4 h-4" />}</button>
                            <span className="w-7 text-center text-[16px] font-semibold tabular-nums">{l.qty}</span>
                            <button type="button" onClick={() => p.setQty(l.product.id, l.qty + 1)} aria-label="Mais" className="w-8 h-8 rounded-full bg-foreground/[0.07] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                        </span>
                    </li>
                ))}
            </ul>
            <div className="border-t border-border/60">
                <CustomerPicker customers={p.customers} onCustomersChange={p.setCustomers} value={p.customerId} onChange={p.setCustomerId} companyId={p.companyId} />
            </div>
            <div className="border-t border-border/60 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-[15px] flex-1">Desconto</span>
                    <Segmented size="sm" ariaLabel="Tipo de desconto" value={p.discountMode} onChange={p.setDiscountMode} options={[{ value: 'brl', label: 'R$' }, { value: 'pct', label: '%' }]} />
                    <input inputMode="decimal" value={p.discount} onChange={e => p.setDiscount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0" aria-label="Desconto" className="w-20 h-9 rounded-lg bg-foreground/[0.06] px-2 text-right text-[16px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                </div>
                {p.discountNeedsPin && <p className="text-[13px] text-orange-700 dark:text-orange-400">Acima de {p.maxPct}%: vai pedir a senha do dono.</p>}
                <div className="flex justify-between text-[15px] text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{brl(p.subtotal)}</span></div>
                {p.discountValue > 0 && <div className="flex justify-between text-[15px] text-red-600 dark:text-red-400"><span>Desconto</span><span className="tabular-nums">−{brl(p.discountValue)}</span></div>}
                <div className="flex justify-between text-[20px] font-semibold"><span>Total</span><span className="tabular-nums">{brl(p.total)}</span></div>
            </div>
            <div className="px-4 pb-4 flex gap-2">
                <SecondaryButton onClick={p.onClear} aria-label="Esvaziar"><Trash2 className="w-5 h-5" /></SecondaryButton>
                <PrimaryButton className="flex-1" onClick={p.onCheckout} disabled={p.disabled}>Cobrar {brl(p.total)}</PrimaryButton>
            </div>
        </div>
    )
}

/* ───────────────────────────── Checkout ───────────────────────────── */

function CheckoutSheet({ total, subtotal, discountValue, discountNeedsPin, cart, customerId, methods, settings, onClose, onDone }: {
    total: number
    subtotal: number
    discountValue: number
    discountNeedsPin: boolean
    cart: Line[]
    customerId: string
    methods: Method[]
    settings: Settings | null
    onClose: () => void
    onDone: (r: { id: string; change: number; total: number }) => void
}) {
    const first = methods[0]?.id ?? ''
    const [rows, setRows] = useState<PayRow[]>([{ key: 1, methodId: first, amount: '', installments: 1 }])
    const [pin, setPin] = useState('')
    const [askPin, setAskPin] = useState(discountNeedsPin)
    const [saving, setSaving] = useState(false)
    const methodOf = (id: string) => methods.find(m => m.id === id)
    const isCash = (id: string) => (methodOf(id)?.code || '').toUpperCase() === 'CASH'
    const isCredit = (id: string) => (methodOf(id)?.code || '').toUpperCase() === 'CREDIT_CARD'
    const isFiado = (id: string) => (methodOf(id)?.code || '').toUpperCase() === 'INSTALLMENT'

    // A lone row with no amount typed means "all of it".
    const amounts = rows.map((r, i) => (rows.length === 1 && !r.amount.trim()) ? total : (i === rows.length - 1 && !r.amount.trim() ? Math.max(0, round2(total - rows.slice(0, -1).reduce((s, x) => s + parseMoney(x.amount), 0))) : parseMoney(r.amount)))
    const paid = round2(amounts.reduce((s, a) => s + a, 0))
    const cashPaid = round2(rows.reduce((s, r, i) => s + (isCash(r.methodId) ? amounts[i] : 0), 0))
    const nonCash = round2(paid - cashPaid)
    const missing = round2(Math.max(0, total - paid))
    const change = round2(Math.max(0, paid - total))
    const overNonCash = nonCash > total + 0.009
    const fee = rows.reduce((s, r, i) => {
        if (!settings) return s
        const code = (methodOf(r.methodId)?.code || '').toUpperCase()
        const rate = code === 'DEBIT_CARD' ? settings.fees.debit.rate : code === 'CREDIT_CARD' ? (r.installments > 1 ? (settings.fees.credit_installments.rate || settings.fees.credit.rate) : settings.fees.credit.rate) : code === 'PIX' ? settings.fees.pix.rate : 0
        return s + amounts[i] * rate / 100
    }, 0)

    const update = (key: number, patch: Partial<PayRow>) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r))
    const addRow = () => {
        const used = new Set(rows.map(r => r.methodId))
        const next = methods.find(m => !used.has(m.id))?.id ?? first
        setRows(rs => [...rs.map((r, i) => i === rs.length - 1 && !r.amount.trim() ? { ...r, amount: String(amounts[i] ? Math.max(0, round2(amounts[i] / 2)) : '').replace('.', ',') } : r), { key: Date.now(), methodId: next, amount: '', installments: 1 }])
    }

    const finish = async () => {
        if (missing > 0.009) return toast.error(`Faltam ${brl(missing)}.`)
        if (overNonCash) return toast.error('Só dinheiro pode passar do total (troco).')
        if (rows.some(r => isFiado(r.methodId)) && !customerId) return toast.error('Para vender no crediário, escolha o cliente no carrinho.')
        if (askPin && !pin) return toast.error('Digite a senha do dono para o desconto.')
        setSaving(true)
        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId || undefined,
                    items: cart.map(l => ({ inventory_item_id: l.product.id, item_name: l.product.name, quantity: l.qty, unit_price: num(l.product.selling_price), total_price: round2(l.qty * num(l.product.selling_price)) })),
                    total_amount: subtotal,
                    discount_amount: discountValue,
                    final_amount: total,
                    payment_method_id: rows[0].methodId,
                    payments: rows.map((r, i) => ({ payment_method_id: r.methodId, amount: round2(amounts[i]), installments: isCredit(r.methodId) && r.installments > 1 ? r.installments : undefined })).filter(x => x.amount > 0),
                    owner_pin: pin || undefined,
                }),
            })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) {
                if (d.code === 'NEEDS_PIN') { setAskPin(true); setPin('') }
                throw new Error(typeof d.error === 'string' ? d.error : 'Não foi possível concluir a venda.')
            }
            onDone({ id: d.id, change, total })
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Sheet
            open
            onClose={onClose}
            title="Cobrar"
            full
            footer={<PrimaryButton className="w-full" onClick={finish} disabled={saving || !rows.every(r => r.methodId)}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}{missing > 0.009 ? `Faltam ${brl(missing)}` : change > 0 ? `Concluir · troco ${brl(change)}` : 'Concluir venda'}</PrimaryButton>}
        >
            <div className="space-y-5">
                <div className="text-center">
                    <p className="text-[13px] text-muted-foreground">Total</p>
                    <p className="text-[40px] leading-tight font-semibold tracking-tight tabular-nums">{brl(total)}</p>
                    {discountValue > 0 && <p className="text-[13px] text-muted-foreground">com {brl(discountValue)} de desconto</p>}
                </div>

                {rows.map((r, i) => (
                    <div key={r.key} className="rounded-2xl bg-card border border-border/60 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] text-muted-foreground">{rows.length > 1 ? `Pagamento ${i + 1}` : 'Forma de pagamento'}</p>
                            {rows.length > 1 && <button type="button" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))} className="text-[13px] text-red-600">Remover</button>}
                        </div>
                        <Chips ariaLabel="Forma" options={methods.map(m => ({ value: m.id, label: m.name.replace(/^Cartão de /, '') }))} value={r.methodId} onChange={v => update(r.key, { methodId: v, installments: 1 })} />
                        <div className="flex items-center gap-2">
                            <label className="flex-1 flex items-baseline gap-1 rounded-xl bg-foreground/[0.05] px-3 h-12 focus-within:ring-2 focus-within:ring-primary/40">
                                <span className="text-[15px] text-muted-foreground">R$</span>
                                <input inputMode="decimal" value={r.amount} onChange={e => update(r.key, { amount: e.target.value.replace(/[^\d.,]/g, '') })} placeholder={amounts[i].toFixed(2).replace('.', ',')} aria-label="Valor" className="w-full min-w-0 bg-transparent text-[20px] font-semibold tabular-nums outline-none leading-[48px]" />
                            </label>
                            {isCredit(r.methodId) && (
                                <select value={r.installments} onChange={e => update(r.key, { installments: Number(e.target.value) })} aria-label="Parcelas" className="h-12 rounded-xl bg-foreground/[0.05] px-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                                    {Array.from({ length: 12 }, (_, k) => k + 1).map(n => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x de ${brl(amounts[i] / n)}`}</option>)}
                                </select>
                            )}
                        </div>
                        {isCash(r.methodId) && rows.length === 1 && (
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                {quickCash(total).map(v => (
                                    <button key={v} type="button" onClick={() => update(r.key, { amount: v.toFixed(2).replace('.', ',') })} className="shrink-0 h-9 px-3 rounded-full bg-foreground/[0.06] text-[15px] tabular-nums">{brl(v)}</button>
                                ))}
                            </div>
                        )}
                        {isFiado(r.methodId) && <p className="text-[13px] text-muted-foreground">Vai para Contas a receber, com vencimento em 30 dias.</p>}
                    </div>
                ))}

                {rows.length < 4 && (
                    <button type="button" onClick={addRow} className="w-full h-11 rounded-xl text-[16px] font-medium text-primary hover:bg-primary/10 inline-flex items-center justify-center gap-1.5">
                        <Plus className="w-5 h-5" /> Dividir em outra forma
                    </button>
                )}

                <Group>
                    <div className="flex justify-between px-4 min-h-[44px] items-center text-[16px]"><span>Recebido</span><span className="tabular-nums">{brl(paid)}</span></div>
                    {missing > 0.009 && <div className="flex justify-between px-4 min-h-[44px] items-center text-[16px] text-red-600 dark:text-red-400"><span>Falta</span><span className="tabular-nums">{brl(missing)}</span></div>}
                    {change > 0 && <div className="flex justify-between px-4 min-h-[44px] items-center text-[17px] font-semibold text-emerald-700 dark:text-emerald-400"><span>Troco</span><span className="tabular-nums">{brl(change)}</span></div>}
                    {fee > 0.004 && <div className="flex justify-between px-4 min-h-[44px] items-center text-[14px] text-muted-foreground"><span>Taxa da maquininha (estimada)</span><span className="tabular-nums">{brl(fee)}</span></div>}
                </Group>
                {overNonCash && <p className="px-1 text-[13px] text-red-600">Cartão/Pix não pode passar do total. Só dinheiro tem troco.</p>}

                {askPin && (
                    <Group footer="O desconto passou do limite da loja.">
                        <Field label="Senha do dono" htmlFor="pdv-pin">
                            <TextInput id="pdv-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                        </Field>
                    </Group>
                )}
            </div>
        </Sheet>
    )
}

function quickCash(total: number) {
    const opts = new Set<number>([total])
    for (const note of [5, 10, 20, 50, 100, 200]) {
        const v = Math.ceil(total / note) * note
        if (v > total) opts.add(v)
    }
    return [...opts].sort((a, b) => a - b).slice(0, 5)
}

/* ────────────────────────────── Receipt ────────────────────────────── */

function ReceiptActions({ saleId }: { saleId: string }) {
    const [sending, setSending] = useState(false)
    const whatsapp = async () => {
        setSending(true)
        try {
            const d = await fetch(`/api/sales/${saleId}/receipt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json())
            if (d.sent) toast.success('Recibo enviado no WhatsApp do cliente')
            else if (d.url) window.open(d.url, '_blank')
        } finally {
            setSending(false)
        }
    }
    return (
        <div className="flex gap-2 w-full pt-2">
            <button type="button" onClick={whatsapp} disabled={sending} className="flex-1 h-11 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 inline-flex items-center justify-center gap-1.5 text-[15px] font-medium">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Recibo no WhatsApp
            </button>
            <Link href={`/pdv/recibo/${saleId}`} className="flex-1 h-11 rounded-full bg-foreground/[0.07] inline-flex items-center justify-center gap-1.5 text-[15px] font-medium"><Printer className="w-4 h-4" /> Imprimir</Link>
        </div>
    )
}

/* ─────────────────────────── History / returns ─────────────────────────── */

function SalesHistory({ onClose, methods }: { onClose: () => void; methods: Method[] }) {
    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState<Sale | null>(null)
    const [returning, setReturning] = useState(false)
    const [qty, setQty] = useState<Record<string, number>>({})
    const [methodId, setMethodId] = useState('')
    const [reason, setReason] = useState('')
    const [busy, setBusy] = useState(false)

    const load = useCallback(() => {
        fetch('/api/sales?days=30').then(r => r.json()).then(d => setSales(Array.isArray(d.data) ? d.data : [])).catch(() => {}).finally(() => setLoading(false))
    }, [])
    useEffect(() => { load() }, [load])

    const left = (i: SaleItem) => num(i.quantity) - num(i.returned_quantity)
    const refund = open ? open.sale_items.reduce((s, i) => s + (qty[i.id] ?? 0) * num(i.unit_price), 0) : 0

    const doReturn = async () => {
        if (!open) return
        const items = Object.entries(qty).filter(([, q]) => q > 0).map(([sale_item_id, quantity]) => ({ sale_item_id, quantity }))
        if (!items.length) return toast.error('Escolha o que vai ser devolvido.')
        setBusy(true)
        try {
            const res = await fetch(`/api/sales/${open.id}/return`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, refund_method_id: methodId || undefined, reason: reason.trim() || undefined }) })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(d.error || 'Não foi possível devolver.')
            toast.success(`Devolvido ${brl(d.refund)}${d.in_register ? ' (saiu do caixa)' : ''}. Produtos voltaram ao estoque.`)
            setReturning(false); setOpen(null); setQty({}); setReason('')
            load()
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setBusy(false)
        }
    }

    if (open) {
        return (
            <Sheet
                open
                onClose={() => { setOpen(null); setReturning(false); setQty({}) }}
                title={`Venda ${code(open.id)}`}
                subtitle={`${new Date(open.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${open.customers?.name ? ` · ${open.customers.name}` : ''}`}
                full
                footer={returning ? (
                    <>
                        <SecondaryButton onClick={() => { setReturning(false); setQty({}) }}>Voltar</SecondaryButton>
                        <PrimaryButton className="flex-1 bg-red-600" onClick={doReturn} disabled={busy || refund <= 0}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Devolver {brl(refund)}</PrimaryButton>
                    </>
                ) : open.status !== 'cancelled' ? (
                    <SecondaryButton className="w-full" onClick={() => { setReturning(true); setMethodId(methods.find(m => m.code === 'CASH')?.id ?? methods[0]?.id ?? '') }}><Undo2 className="w-5 h-5" /> Troca ou devolução</SecondaryButton>
                ) : undefined}
            >
                <div className="space-y-4">
                    <div tabIndex={-1} data-autofocus className="outline-none" aria-hidden />
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                        {open.sale_items.map(i => (
                            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15px] font-medium truncate">{i.item_name}</span>
                                    <span className="block text-[13px] text-muted-foreground">{num(i.quantity)} × {brl(num(i.unit_price))}{num(i.returned_quantity) > 0 ? ` · ${num(i.returned_quantity)} devolvido` : ''}</span>
                                </span>
                                {returning && left(i) > 0 ? (
                                    <span className="flex items-center gap-1">
                                        <button type="button" onClick={() => setQty(q => ({ ...q, [i.id]: Math.max(0, (q[i.id] ?? 0) - 1) }))} className="w-8 h-8 rounded-full bg-foreground/[0.07] flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                                        <span className="w-6 text-center tabular-nums font-semibold">{qty[i.id] ?? 0}</span>
                                        <button type="button" onClick={() => setQty(q => ({ ...q, [i.id]: Math.min(left(i), (q[i.id] ?? 0) + 1) }))} className="w-8 h-8 rounded-full bg-foreground/[0.07] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                                    </span>
                                ) : <span className="text-[15px] tabular-nums">{brl(num(i.total_price))}</span>}
                            </li>
                        ))}
                    </ul>
                    {!returning && (
                        <>
                            <div className="flex justify-between px-1 text-[17px] font-semibold"><span>Total</span><span className="tabular-nums">{brl(num(open.final_amount))}</span></div>
                            {open.status === 'cancelled' && <p className="px-1 text-[15px] text-red-600">Venda devolvida.</p>}
                            <ReceiptActions saleId={open.id} />
                        </>
                    )}
                    {returning && (
                        <>
                            <div className="space-y-2">
                                <p className="px-1 text-[13px] text-muted-foreground">Devolver o dinheiro como</p>
                                <Chips ariaLabel="Forma" options={methods.filter(m => m.code !== 'INSTALLMENT').map(m => ({ value: m.id, label: m.name.replace(/^Cartão de /, '') }))} value={methodId} onChange={setMethodId} />
                            </div>
                            <Group footer="Os produtos voltam ao estoque e o valor sai do seu caixa aberto. Para troca, devolva e faça uma nova venda.">
                                <Field label="Motivo (opcional)" htmlFor="rt-reason">
                                    <TextInput id="rt-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex.: defeito, tamanho errado" />
                                </Field>
                            </Group>
                        </>
                    )}
                </div>
            </Sheet>
        )
    }

    return (
        <Sheet open onClose={onClose} title="Vendas dos últimos 30 dias" full>
            {loading ? <div className="h-40 animate-pulse rounded-2xl bg-foreground/[0.04]" /> : sales.length ? (
                <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                    {sales.map(s => (
                        <li key={s.id}>
                            <button type="button" onClick={() => setOpen(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15px] font-medium truncate">{code(s.id)} · {s.sale_items.map(i => i.item_name).join(', ')}</span>
                                    <span className="block text-[13px] text-muted-foreground truncate">
                                        {new Date(s.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        {s.customers?.name ? ` · ${s.customers.name}` : ''}{s.users?.full_name ? ` · ${s.users.full_name.split(' ')[0]}` : ''}
                                    </span>
                                </span>
                                <span className={cn('text-[15px] font-semibold tabular-nums', s.status === 'cancelled' && 'line-through text-muted-foreground')}>{brl(num(s.final_amount))}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : <p className="px-4 py-10 text-center text-muted-foreground"><UserRound className="w-8 h-8 mx-auto mb-2 opacity-40" />Nenhuma venda ainda.</p>}
        </Sheet>
    )
}
