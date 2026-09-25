'use client'

import { useMemo, useState } from 'react'
import { Minus, Package, Plus, Search, Wrench } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { cn } from '@/lib/utils'
import { brl, moneyText, parseMoney, TextInput } from '@/components/ui/form'
import type { InventoryOption, OSItem } from './state'

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const newKey = () => `item-${Math.random().toString(36).slice(2)}-${Date.now()}`

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    return (
        <div className="inline-flex items-center rounded-full bg-foreground/[0.06]">
            <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Diminuir" className="w-10 h-10 flex items-center justify-center disabled:opacity-30">
                <Minus className="w-4 h-4" />
            </button>
            <span className="min-w-[2ch] text-center text-[17px] font-medium tabular-nums" aria-live="polite">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)} aria-label="Aumentar" className="w-10 h-10 flex items-center justify-center">
                <Plus className="w-4 h-4" />
            </button>
        </div>
    )
}

type Draft = { key: string | null; inventory_item_id: string | null; name: string; quantity: number; price: string; cost: string }

/**
 * Parts and services on the order: a plain list with the total per line.
 * Tap a line to change it; add from stock or type a free item.
 */
export default function ItemsEditor({ items, onChange, inventory }: { items: OSItem[]; onChange: (items: OSItem[]) => void; inventory: InventoryOption[] }) {
    const [picking, setPicking] = useState(false)
    const [query, setQuery] = useState('')
    const [draft, setDraft] = useState<Draft | null>(null)

    const results = useMemo(() => {
        const q = normalize(query.trim())
        return (q ? inventory.filter(i => normalize(`${i.name} ${i.category ?? ''}`).includes(q)) : inventory).slice(0, 50)
    }, [inventory, query])

    const addFromStock = (inv: InventoryOption) => {
        const existing = items.find(i => i.inventory_item_id === inv.id)
        if (existing) {
            onChange(items.map(i => i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i))
        } else {
            onChange([...items, {
                key: newKey(),
                inventory_item_id: inv.id,
                item_name: inv.name,
                quantity: 1,
                unit_price: Number(inv.selling_price) || 0,
                unit_cost: Number(inv.cost_price) || 0,
            }])
        }
        setPicking(false)
        setQuery('')
    }

    const saveDraft = () => {
        if (!draft || !draft.name.trim()) return
        const item: OSItem = {
            key: draft.key ?? newKey(),
            inventory_item_id: draft.inventory_item_id,
            item_name: draft.name.trim(),
            quantity: Math.max(1, draft.quantity),
            unit_price: parseMoney(draft.price),
            unit_cost: parseMoney(draft.cost),
        }
        onChange(draft.key ? items.map(i => i.key === draft.key ? item : i) : [...items, item])
        setDraft(null)
    }

    return (
        <>
            <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                {items.map(item => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => setDraft({ key: item.key, inventory_item_id: item.inventory_item_id, name: item.item_name, quantity: item.quantity, price: moneyText(item.unit_price), cost: moneyText(item.unit_cost) })}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]"
                    >
                        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', item.inventory_item_id ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400')}>
                            {item.inventory_item_id ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block text-[17px] leading-snug truncate">{item.item_name}</span>
                            <span className="block text-[13px] text-muted-foreground tabular-nums">{item.quantity} × {brl(item.unit_price)}</span>
                        </span>
                        <span className="text-[17px] font-medium tabular-nums shrink-0">{brl(item.quantity * item.unit_price)}</span>
                    </button>
                ))}
                <div className="flex divide-x divide-border/60">
                    <button type="button" onClick={() => setPicking(true)} disabled={!inventory.length} className="flex-1 min-h-[52px] px-3 text-[15px] font-medium text-primary inline-flex items-center justify-center gap-1.5 disabled:opacity-40">
                        <Package className="w-[18px] h-[18px]" /> Do estoque
                    </button>
                    <button type="button" onClick={() => setDraft({ key: null, inventory_item_id: null, name: '', quantity: 1, price: '', cost: '' })} className="flex-1 min-h-[52px] px-3 text-[15px] font-medium text-primary inline-flex items-center justify-center gap-1.5">
                        <Plus className="w-[18px] h-[18px]" /> Serviço ou peça
                    </button>
                </div>
            </div>

            {/* Stock search */}
            <Sheet open={picking} onClose={() => { setPicking(false); setQuery('') }} title="Adicionar do estoque" full>
                <div className="sticky top-0 bg-card pb-3 z-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            data-autofocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Buscar peça ou produto"
                            className="w-full h-11 rounded-xl bg-foreground/[0.06] pl-9 pr-3 text-[17px] outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                </div>
                <ul className="rounded-xl bg-foreground/[0.03] divide-y divide-border/60 overflow-hidden">
                    {results.map(inv => (
                        <li key={inv.id}>
                            <button type="button" onClick={() => addFromStock(inv)} className="w-full flex items-center gap-3 px-4 min-h-[56px] py-2 text-left hover:bg-foreground/[0.03]">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[17px] leading-snug truncate">{inv.name}</span>
                                    {inv.category && <span className="block text-[13px] text-muted-foreground truncate">{inv.category}</span>}
                                </span>
                                <span className="text-[15px] tabular-nums text-muted-foreground shrink-0">{brl(Number(inv.selling_price) || 0)}</span>
                            </button>
                        </li>
                    ))}
                    {!results.length && <li className="px-4 py-6 text-center text-[15px] text-muted-foreground">Nada encontrado no estoque.</li>}
                </ul>
            </Sheet>

            {/* Add / edit one line */}
            <Sheet
                open={!!draft}
                onClose={() => setDraft(null)}
                title={draft?.key ? 'Editar item' : 'Serviço ou peça'}
                footer={draft && (
                    <>
                        {draft.key && (
                            <button type="button" onClick={() => { onChange(items.filter(i => i.key !== draft.key)); setDraft(null) }} className="h-11 px-3 rounded-xl text-[17px] text-red-600 dark:text-red-400 hover:bg-red-500/10">
                                Remover
                            </button>
                        )}
                        <button type="button" onClick={saveDraft} disabled={!draft.name.trim()} className="ml-auto h-11 px-6 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold disabled:opacity-50">
                            {draft.key ? 'Salvar' : 'Adicionar'}
                        </button>
                    </>
                )}
            >
                {draft && (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-foreground/[0.04] divide-y divide-border/60">
                            <div className="px-4 py-3">
                                <label htmlFor="os-item-name" className="block text-[13px] text-muted-foreground mb-1">Descrição</label>
                                <TextInput id="os-item-name" data-autofocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Troca de tela" disabled={!!draft.inventory_item_id} />
                            </div>
                            <div className="px-4 py-2 flex items-center justify-between gap-3">
                                <span className="text-[17px]">Quantidade</span>
                                <Stepper value={draft.quantity} onChange={n => setDraft({ ...draft, quantity: n })} />
                            </div>
                            <div className="px-4 py-3 grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="os-item-price" className="block text-[13px] text-muted-foreground mb-1">Preço unitário</label>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[15px] text-muted-foreground">R$</span>
                                        <TextInput id="os-item-price" inputMode="decimal" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="0,00" className="tabular-nums" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="os-item-cost" className="block text-[13px] text-muted-foreground mb-1">Custo (opcional)</label>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[15px] text-muted-foreground">R$</span>
                                        <TextInput id="os-item-cost" inputMode="decimal" value={draft.cost} onChange={e => setDraft({ ...draft, cost: e.target.value })} placeholder="0,00" className="tabular-nums" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="flex items-center justify-between px-1 text-[17px]">
                            <span className="text-muted-foreground">Total do item</span>
                            <span className="font-semibold tabular-nums">{brl(parseMoney(draft.price) * draft.quantity)}</span>
                        </p>
                    </div>
                )}
            </Sheet>
        </>
    )
}
