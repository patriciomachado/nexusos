'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowDownRight, ArrowUpRight, ClipboardList, Copy, Loader2, MessageCircle, Package, Pencil, Plus, ScanBarcode, Search, Tags, Trash2, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Segmented from '@/components/ui/Segmented'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, TextInput, brl, parseMoney } from '@/components/ui/form'
import { cn } from '@/lib/utils'

/**
 * Produtos: the store's stock at a glance. Search by name, SKU or barcode
 * (also with the camera), what needs restocking, each product's card with
 * margin, quick stock in/out and its history, and a shopping list to send
 * to the supplier.
 */

export interface Product {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    category: string | null
    description: string | null
    cost_price: number | string | null
    selling_price: number | string | null
    quantity_in_stock: number | string | null
    minimum_quantity: number | string | null
    maximum_quantity: number | string | null
    unit: string | null
    image_url: string | null
    supplier?: string | null
    location?: string | null
    updated_at?: string
}

interface Movement {
    id: string
    quantity: number
    balance: number | null
    kind: string
    reason: string | null
    unit_cost: number | null
    created_at: string
    users?: { full_name: string | null } | { full_name: string | null }[] | null
}

const num = (v: unknown) => Number(v) || 0
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const qty = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const isLow = (p: Product) => num(p.quantity_in_stock) <= num(p.minimum_quantity)
const isOut = (p: Product) => num(p.quantity_in_stock) <= 0
/** How many to buy: back to twice the minimum (at least one). */
const toBuy = (p: Product) => Math.max(1, Math.ceil(Math.max(num(p.minimum_quantity), 1) * 2 - num(p.quantity_in_stock)))
const margin = (p: Product) => (num(p.selling_price) > 0 ? (num(p.selling_price) - num(p.cost_price)) / num(p.selling_price) : null)

const KIND: Record<string, { label: string; tone: string }> = {
    entrada: { label: 'Entrada', tone: 'text-emerald-700 dark:text-emerald-400' },
    devolucao: { label: 'Devolução', tone: 'text-emerald-700 dark:text-emerald-400' },
    saida: { label: 'Saída', tone: 'text-red-600 dark:text-red-400' },
    venda: { label: 'Venda', tone: 'text-foreground' },
    os: { label: 'Usado em OS', tone: 'text-foreground' },
    ajuste: { label: 'Ajuste', tone: 'text-foreground' },
}

export default function ProductsClient({ initial }: { initial: Product[] }) {
    const router = useRouter()
    const [items, setItems] = useState(initial)
    const [view, setView] = useState<'all' | 'low' | 'out'>('all')
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState<string>('')
    const [scanning, setScanning] = useState(false)
    const [open, setOpen] = useState<Product | null>(null)
    const [restock, setRestock] = useState(false)
    const [categories, setCategories] = useState(false)

    useEffect(() => { setItems(initial) }, [initial])

    const low = items.filter(isLow)
    const out = items.filter(isOut)
    const cats = useMemo(() => Array.from(new Set(items.map(p => p.category).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR')), [items])

    const list = useMemo(() => {
        const q = normalize(query.trim())
        return items.filter(p =>
            (view === 'all' || (view === 'low' ? isLow(p) : isOut(p))) &&
            (!category || p.category === category) &&
            (!q || normalize(`${p.name} ${p.sku ?? ''} ${p.barcode ?? ''} ${p.category ?? ''} ${p.location ?? ''}`).includes(q)))
    }, [items, view, category, query])

    const stockCost = items.reduce((s, p) => s + Math.max(0, num(p.quantity_in_stock)) * num(p.cost_price), 0)
    const stockSale = items.reduce((s, p) => s + Math.max(0, num(p.quantity_in_stock)) * num(p.selling_price), 0)

    const onScan = (code: string) => {
        const hit = items.find(p => p.barcode === code || p.sku === code)
        if (hit) { setOpen(hit); return }
        setQuery(code)
        toast('Nenhum produto com esse código.', { action: { label: 'Cadastrar', onClick: () => router.push(`/inventory/new?barcode=${encodeURIComponent(code)}`) } })
    }

    const replace = (p: Product) => {
        setItems(list => list.map(x => x.id === p.id ? { ...x, ...p } : x))
        setOpen(o => (o?.id === p.id ? { ...o, ...p } : o))
    }
    const remove = (id: string) => {
        setItems(list => list.filter(x => x.id !== id))
        setOpen(null)
    }

    return (
        <div className="min-h-full bg-background">
            <Header title="Produtos" />
            <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-4 pb-16 space-y-4">
                <Segmented ariaLabel="Mostrar" value={view} onChange={setView} options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'low', label: 'Repor', badge: low.length },
                    { value: 'out', label: 'Sem estoque', badge: out.length },
                ]} />

                <div className="flex items-center gap-2">
                    <label className="flex-1 min-w-0 flex items-center gap-2 h-11 px-3 rounded-xl bg-foreground/[0.06] focus-within:ring-2 focus-within:ring-primary/40">
                        <Search aria-hidden className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome, SKU ou código de barras" aria-label="Buscar produto" autoComplete="off" className="flex-1 min-w-0 bg-transparent text-[17px] outline-none" />
                    </label>
                    <button type="button" onClick={() => setScanning(true)} aria-label="Ler código de barras" className="w-11 h-11 shrink-0 rounded-xl bg-foreground/[0.06] text-primary flex items-center justify-center hover:bg-foreground/[0.1] transition-colors">
                        <ScanBarcode aria-hidden className="w-5 h-5" />
                    </button>
                </div>

                {cats.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                        {['', ...cats].map(c => (
                            <button key={c || 'all'} type="button" onClick={() => setCategory(c)} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium transition-colors', category === c ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}>
                                {c || 'Todas'}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                    <Stat label="Produtos" value={String(items.length)} />
                    <Stat label="Em estoque (custo)" value={brl(stockCost)} />
                    <Stat label="Lucro previsto" value={brl(stockSale - stockCost)} />
                </div>

                <div className="flex gap-2">
                    <Link href="/inventory/new" className="flex-1 h-12 px-5 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                        <Plus aria-hidden className="w-5 h-5" /> Novo produto
                    </Link>
                    {view !== 'all' && low.length > 0 ? (
                        <SecondaryButton onClick={() => setRestock(true)}><ClipboardList aria-hidden className="w-5 h-5" /> Lista de compra</SecondaryButton>
                    ) : (
                        <SecondaryButton onClick={() => setCategories(true)}><Tags aria-hidden className="w-5 h-5" /> Categorias</SecondaryButton>
                    )}
                </div>

                {list.length ? (
                    <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {list.map(p => (
                            <li key={p.id}>
                                <button type="button" onClick={() => setOpen(p)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.04] transition-colors">
                                    <Thumb p={p} />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[15px] font-medium truncate">{p.name}</span>
                                        <span className="block text-[13px] text-muted-foreground truncate">
                                            {[p.category, p.sku, p.location].filter(Boolean).join(' · ') || 'Sem categoria'}
                                        </span>
                                    </span>
                                    <span className="flex flex-col items-end shrink-0 gap-0.5">
                                        <span className="text-[15px] font-semibold tabular-nums">{brl(num(p.selling_price))}</span>
                                        <StockPill p={p} />
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="py-12 text-center text-[15px] text-muted-foreground text-pretty">
                        {items.length === 0 ? 'Nenhum produto ainda. Cadastre peças, películas e acessórios para vender no PDV e usar nas OS.'
                            : view === 'low' ? 'Nada para repor. Tudo acima do estoque mínimo.'
                            : view === 'out' ? 'Nenhum produto zerado.'
                            : 'Nenhum produto encontrado.'}
                    </p>
                )}
            </div>

            <BarcodeScannerModal isOpen={scanning} onClose={() => setScanning(false)} onScan={code => { setScanning(false); onScan(code) }} title="Ler código do produto" />
            <ProductSheet product={open} onClose={() => setOpen(null)} onChange={replace} onRemoved={remove} />
            <RestockSheet open={restock} onClose={() => setRestock(false)} items={low} />
            <CategoriesSheet open={categories} onClose={() => setCategories(false)} />
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 px-3 py-2.5 min-w-0">
            <p className="text-[12px] text-muted-foreground truncate">{label}</p>
            <p className="text-[17px] font-semibold tabular-nums truncate">{value}</p>
        </div>
    )
}

function Thumb({ p, size = 'sm' }: { p: Product; size?: 'sm' | 'lg' }) {
    const box = size === 'lg' ? 'w-16 h-16 rounded-2xl' : 'w-11 h-11 rounded-xl'
    return p.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image_url} alt="" width={size === 'lg' ? 64 : 44} height={size === 'lg' ? 64 : 44} loading="lazy" className={cn(box, 'object-cover shrink-0 bg-foreground/[0.05]')} />
    ) : (
        <span className={cn(box, 'shrink-0 bg-foreground/[0.06] text-muted-foreground flex items-center justify-center')}>
            <Package aria-hidden className={size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'} />
        </span>
    )
}

function StockPill({ p }: { p: Product }) {
    const q = num(p.quantity_in_stock)
    const tone = isOut(p) ? 'bg-red-500/12 text-red-700 dark:text-red-400' : isLow(p) ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400' : 'bg-foreground/[0.06] text-muted-foreground'
    return <span className={cn('px-2 h-6 rounded-full text-[12px] font-semibold inline-flex items-center tabular-nums', tone)}>{qty(q)} {p.unit || 'un'}</span>
}

const REASONS_IN = ['Compra', 'Devolução de cliente', 'Correção']
const REASONS_OUT = ['Perda / quebra', 'Uso interno', 'Garantia', 'Correção']

function ProductSheet({ product, onClose, onChange, onRemoved }: {
    product: Product | null
    onClose: () => void
    onChange: (p: Product) => void
    onRemoved: (id: string) => void
}) {
    const [history, setHistory] = useState<Movement[] | null>(null)
    const [historyReady, setHistoryReady] = useState(true)
    const [adjust, setAdjust] = useState<'in' | 'out' | null>(null)
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [unitCost, setUnitCost] = useState('')
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const id = product?.id

    useEffect(() => {
        setAdjust(null)
        setHistory(null)
        if (!id) return
        let alive = true
        fetch(`/api/inventory/${id}/movements`).then(r => r.json()).then(d => {
            if (!alive) return
            setHistory(Array.isArray(d.data) ? d.data : [])
            setHistoryReady(d.ready !== false)
        }).catch(() => alive && setHistory([]))
        return () => { alive = false }
    }, [id])

    if (!product) return null
    const p = product
    const m = margin(p)

    const startAdjust = (dir: 'in' | 'out') => {
        setAdjust(dir)
        setAmount('')
        setReason(dir === 'in' ? 'Compra' : 'Perda / quebra')
        setUnitCost(num(p.cost_price) ? String(num(p.cost_price)).replace('.', ',') : '')
    }

    const save = async () => {
        const n = parseMoney(amount)
        if (!n) { toast.error('Informe a quantidade'); return }
        if (adjust === 'out' && n > num(p.quantity_in_stock)) { toast.error(`Só há ${qty(num(p.quantity_in_stock))} em estoque.`); return }
        setSaving(true)
        try {
            const cost = adjust === 'in' && reason === 'Compra' ? parseMoney(unitCost) : null
            const res = await fetch(`/api/inventory/${p.id}/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity: adjust === 'in' ? n : -n,
                    kind: reason === 'Correção' ? 'ajuste' : adjust === 'in' ? 'entrada' : 'saida',
                    reason,
                    unit_cost: cost || null,
                }),
            })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(typeof d.error === 'string' ? d.error : 'Não foi possível ajustar o estoque.')
            onChange({ ...p, ...d, cost_price: cost || p.cost_price })
            setHistory(h => [{ id: `local-${Date.now()}`, quantity: adjust === 'in' ? n : -n, balance: num(d.quantity_in_stock), kind: adjust === 'in' ? 'entrada' : 'saida', reason, unit_cost: cost, created_at: new Date().toISOString() }, ...(h ?? [])])
            toast.success(adjust === 'in' ? 'Entrada registrada' : 'Saída registrada')
            setAdjust(null)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        setConfirmDelete(false)
        const res = await fetch(`/api/inventory/${p.id}`, { method: 'DELETE' })
        if (res.ok) { toast.success('Produto excluído'); onRemoved(p.id) }
        else toast.error('Não foi possível excluir. Tente de novo.')
    }

    return (
        <>
            <Sheet open={!!product} onClose={onClose} title={p.name} subtitle={[p.category, p.sku].filter(Boolean).join(' · ') || undefined} size="lg" full>
                <div className="space-y-5">
                    <div className="flex items-center gap-4 pt-1">
                        <Thumb p={p} size="lg" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-muted-foreground">Em estoque</p>
                            <p className={cn('text-[28px] font-semibold tabular-nums leading-tight', isOut(p) ? 'text-red-600 dark:text-red-400' : isLow(p) ? 'text-amber-700 dark:text-amber-400' : '')}>
                                {qty(num(p.quantity_in_stock))} <span className="text-[17px] font-normal text-muted-foreground">{p.unit || 'un'}</span>
                            </p>
                            <p className="text-[13px] text-muted-foreground">Mínimo {qty(num(p.minimum_quantity))}{isLow(p) ? ` · comprar ${qty(toBuy(p))}` : ''}</p>
                        </div>
                    </div>

                    {adjust ? (
                        <Group title={adjust === 'in' ? 'Entrada de estoque' : 'Saída de estoque'}>
                            <div className="grid grid-cols-2 divide-x divide-border/60">
                                <Field label="Quantidade" htmlFor="pd-qty">
                                    <TextInput id="pd-qty" data-autofocus inputMode="decimal" enterKeyHint="done" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0" className="tabular-nums" />
                                </Field>
                                {adjust === 'in' && reason === 'Compra' ? (
                                    <Field label="Custo unitário (R$)" htmlFor="pd-cost">
                                        <TextInput id="pd-cost" inputMode="decimal" value={unitCost} onChange={e => setUnitCost(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" className="tabular-nums" />
                                    </Field>
                                ) : <div />}
                            </div>
                            <div className="p-3">
                                <Chips ariaLabel="Motivo" options={(adjust === 'in' ? REASONS_IN : REASONS_OUT).map(r => ({ value: r, label: r }))} value={reason} onChange={setReason} />
                            </div>
                            <div className="flex gap-2 p-3 pt-0">
                                <SecondaryButton onClick={() => setAdjust(null)} aria-label="Cancelar ajuste"><X aria-hidden className="w-5 h-5" /></SecondaryButton>
                                <PrimaryButton className="flex-1" onClick={save} disabled={saving}>
                                    {saving && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />}
                                    {adjust === 'in' ? 'Registrar entrada' : 'Registrar saída'}
                                </PrimaryButton>
                            </div>
                        </Group>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <SecondaryButton onClick={() => startAdjust('in')} className="text-emerald-700 dark:text-emerald-400"><ArrowUpRight aria-hidden className="w-5 h-5" /> Entrada</SecondaryButton>
                            <SecondaryButton onClick={() => startAdjust('out')} className="text-red-600 dark:text-red-400"><ArrowDownRight aria-hidden className="w-5 h-5" /> Saída</SecondaryButton>
                        </div>
                    )}

                    <Group title="Preço">
                        <Row label="Venda" value={brl(num(p.selling_price))} />
                        <Row label="Custo" value={brl(num(p.cost_price))} />
                        <Row label="Lucro por unidade" value={m == null ? '—' : `${brl(num(p.selling_price) - num(p.cost_price))} · ${(m * 100).toFixed(0)}%`} tone={m != null && m < 0.15 ? 'text-amber-700 dark:text-amber-400' : undefined} />
                    </Group>

                    {(p.barcode || p.supplier || p.location || p.description) && (
                        <Group title="Detalhes">
                            {p.barcode && <Row label="Código de barras" value={p.barcode} mono />}
                            {p.supplier && <Row label="Fornecedor" value={p.supplier} />}
                            {p.location && <Row label="Onde fica" value={p.location} />}
                            {p.description && <p className="px-4 py-3 text-[15px] text-muted-foreground whitespace-pre-wrap break-words">{p.description}</p>}
                        </Group>
                    )}

                    <Group title="Histórico de estoque" footer={!historyReady ? 'O histórico começa a ser registrado depois da atualização do banco (20261002_produtos_agenda.sql).' : undefined}>
                        {history === null ? (
                            <div className="px-4 py-6 flex justify-center"><Loader2 aria-hidden className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                        ) : history.length ? history.slice(0, 30).map(h => {
                            const k = KIND[h.kind] ?? KIND.ajuste
                            const who = Array.isArray(h.users) ? h.users[0]?.full_name : h.users?.full_name
                            return (
                                <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 min-h-[52px]">
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[15px] truncate">{h.reason || k.label}</span>
                                        <span className="block text-[12px] text-muted-foreground truncate">
                                            {new Date(h.created_at).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            {who ? ` · ${who.split(' ')[0]}` : ''}
                                        </span>
                                    </span>
                                    <span className="flex flex-col items-end shrink-0">
                                        <span className={cn('text-[15px] font-semibold tabular-nums', h.quantity > 0 ? 'text-emerald-700 dark:text-emerald-400' : k.tone)}>{h.quantity > 0 ? '+' : ''}{qty(Number(h.quantity))}</span>
                                        {h.balance != null && <span className="text-[12px] text-muted-foreground tabular-nums">fica {qty(Number(h.balance))}</span>}
                                    </span>
                                </div>
                            )
                        }) : <p className="px-4 py-5 text-[15px] text-muted-foreground">Nenhuma movimentação registrada.</p>}
                    </Group>

                    <div className="flex gap-2">
                        <SecondaryButton className="text-red-600 dark:text-red-400" onClick={() => setConfirmDelete(true)} aria-label="Excluir produto"><Trash2 aria-hidden className="w-5 h-5" /></SecondaryButton>
                        <Link href={`/inventory/${p.id}/edit`} className="flex-1 h-12 px-5 rounded-full bg-foreground/[0.07] text-foreground text-[17px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-foreground/[0.1] transition-colors">
                            <Pencil aria-hidden className="w-5 h-5" /> Editar produto
                        </Link>
                    </div>
                </div>
            </Sheet>
            <PremiumConfirmDialog
                isOpen={confirmDelete}
                title="Excluir produto?"
                description="Ele sai da lista e do PDV. As vendas antigas continuam registradas."
                confirmLabel="Excluir"
                cancelLabel="Manter"
                onConfirm={remove}
                onCancel={() => setConfirmDelete(false)}
            />
        </>
    )
}

function Row({ label, value, tone, mono }: { label: string; value: string; tone?: string; mono?: boolean }) {
    return (
        <div className="flex items-center gap-3 px-4 min-h-[48px]">
            <span className="text-[17px] shrink-0">{label}</span>
            <span className={cn('ml-auto text-[17px] text-muted-foreground text-right truncate tabular-nums', mono && 'font-mono text-[15px]', tone)}>{value}</span>
        </div>
    )
}

function RestockSheet({ open, onClose, items }: { open: boolean; onClose: () => void; items: Product[] }) {
    // Only what was changed by hand; everything else uses the suggestion.
    const [amounts, setAmounts] = useState<Record<string, string>>({})
    const amountOf = (p: Product) => amounts[p.id] ?? String(toBuy(p))

    const lines = items.map(p => ({ p, n: parseMoney(amountOf(p)) })).filter(l => l.n > 0)
    const total = lines.reduce((s, l) => s + l.n * num(l.p.cost_price), 0)
    // Grouped by supplier, so each list can go to the right person.
    const bySupplier = new Map<string, typeof lines>()
    for (const l of lines) {
        const k = l.p.supplier?.trim() || ''
        bySupplier.set(k, [...(bySupplier.get(k) ?? []), l])
    }
    const text = [
        'Lista de compra',
        ...Array.from(bySupplier.entries()).flatMap(([sup, ls]) => [
            ...(bySupplier.size > 1 || sup ? ['', sup ? `*${sup}*` : '*Sem fornecedor*'] : []),
            ...ls.map(l => `• ${qty(l.n)} ${l.p.unit || 'un'} — ${l.p.name}${l.p.sku ? ` (${l.p.sku})` : ''}`),
        ]),
    ].join('\n')

    const copy = async () => {
        try { await navigator.clipboard.writeText(text); toast.success('Lista copiada') }
        catch { toast.error('Não deu para copiar.') }
    }

    return (
        <Sheet
            open={open}
            onClose={() => { setAmounts({}); onClose() }}
            title="Lista de compra"
            subtitle={lines.length ? `${lines.length} ${lines.length === 1 ? 'produto' : 'produtos'} · cerca de ${brl(total)}` : undefined}
            size="lg"
            full
            footer={lines.length ? (
                <>
                    <SecondaryButton onClick={copy} aria-label="Copiar lista"><Copy aria-hidden className="w-5 h-5" /></SecondaryButton>
                    <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="flex-1 h-12 px-6 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                        <MessageCircle aria-hidden className="w-5 h-5" /> Enviar no WhatsApp
                    </a>
                </>
            ) : undefined}
        >
            <p className="pb-3 text-[13px] text-muted-foreground">Produtos no mínimo ou abaixo dele. A sugestão repõe até o dobro do mínimo; ajuste as quantidades.</p>
            <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                {items.map(p => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex-1 min-w-0">
                            <span className="block text-[15px] font-medium truncate">{p.name}</span>
                            <span className="block text-[12px] text-muted-foreground truncate">tem {qty(num(p.quantity_in_stock))} · mínimo {qty(num(p.minimum_quantity))}{p.supplier ? ` · ${p.supplier}` : ''}</span>
                        </span>
                        <input
                            inputMode="decimal"
                            value={amountOf(p)}
                            onChange={e => setAmounts(a => ({ ...a, [p.id]: e.target.value.replace(/[^\d.,]/g, '') }))}
                            aria-label={`Comprar de ${p.name}`}
                            className="w-16 h-10 rounded-lg bg-foreground/[0.06] text-center text-[17px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        />
                    </li>
                ))}
            </ul>
        </Sheet>
    )
}

function CategoriesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [list, setList] = useState<{ id: string; name: string }[] | null>(null)
    const [name, setName] = useState('')
    const [busy, setBusy] = useState(false)
    const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null)

    useEffect(() => {
        if (!open) return
        fetch('/api/inventory/categories').then(r => r.json()).then(d => setList(Array.isArray(d) ? d : [])).catch(() => setList([]))
    }, [open])

    const add = async () => {
        const n = name.trim()
        if (!n) return
        setBusy(true)
        try {
            const res = await fetch('/api/inventory/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(typeof d.error === 'string' ? d.error : 'Não foi possível criar a categoria.')
            setList(l => [...(l ?? []), { id: d.id ?? n, name: n }].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
            setName('')
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        const c = removing
        setRemoving(null)
        if (!c) return
        const res = await fetch(`/api/inventory/categories/${encodeURIComponent(c.id)}`, { method: 'DELETE' })
        if (res.ok) setList(l => (l ?? []).filter(x => x.id !== c.id))
        else toast.error('Não foi possível excluir. Tente de novo.')
    }

    return (
        <>
            <Sheet open={open} onClose={onClose} title="Categorias">
                <div className="space-y-4">
                    <Group>
                        <div className="flex items-center gap-2 pr-2">
                            <Field label="Nova categoria" htmlFor="cat-new" className="flex-1">
                                <TextInput id="cat-new" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Ex.: Películas" />
                            </Field>
                            <button type="button" onClick={add} disabled={busy || !name.trim()} aria-label="Adicionar categoria" className="w-11 h-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity">
                                {busy ? <Loader2 aria-hidden className="w-5 h-5 animate-spin" /> : <Plus aria-hidden className="w-5 h-5" />}
                            </button>
                        </div>
                    </Group>
                    {list === null ? (
                        <div className="py-6 flex justify-center"><Loader2 aria-hidden className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : list.length ? (
                        <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                            {list.map(c => (
                                <li key={c.id} className="flex items-center gap-3 px-4 min-h-[48px]">
                                    <span className="flex-1 text-[17px] truncate">{c.name}</span>
                                    {/* Names only found on products (no category row) can't be deleted here. */}
                                    {UUID.test(c.id) && (
                                        <button type="button" onClick={() => setRemoving(c)} aria-label={`Excluir ${c.name}`} className="w-9 h-9 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                                            <Trash2 aria-hidden className="w-[18px] h-[18px]" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : <p className="py-6 text-center text-[15px] text-muted-foreground">Nenhuma categoria ainda.</p>}
                </div>
            </Sheet>
            <PremiumConfirmDialog
                isOpen={!!removing}
                title="Excluir categoria?"
                description={`Os produtos de “${removing?.name ?? ''}” continuam cadastrados.`}
                confirmLabel="Excluir"
                cancelLabel="Manter"
                onConfirm={remove}
                onCancel={() => setRemoving(null)}
            />
        </>
    )
}

