'use client'

import { useEffect, useState } from 'react'
import { Calculator, History } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Chips, Field, Group, PrimaryButton, TextInput, brl, moneyText, parseMoney } from '@/components/ui/form'
import { marginAt, marginTone, quote, type PricingData, type ServiceRow } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import type { OSItem } from './state'

const LABOR = 'Mão de obra'
const isLabor = (i: OSItem) => !i.inventory_item_id && i.item_name.trim().toLowerCase().startsWith(LABOR.toLowerCase())
const newKey = () => `item-${Math.random().toString(36).slice(2)}-${Date.now()}`

const TIMES = [
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '60', label: '1 h' },
    { value: '90', label: '1 h 30' },
    { value: '120', label: '2 h' },
]

interface Stats { count: number; average?: number; min?: number; max?: number; last?: number }

// One fetch per page load: the OS wizard and editor mount the budget step often.
let cached: Promise<PricingData | null> | null = null
const loadPricing = () => (cached ??= fetch('/api/pricing').then(r => (r.ok ? r.json() : null)).catch(() => { cached = null; return null }))

/**
 * "Calcular preço" button for the OS budget: shows the minimum and suggested
 * price for the parts already added plus the bench time, and adds the labor
 * item that brings the OS to that total. Only managers and owners see it.
 */
export default function PriceCalculator({ items, onChange, hint }: { items: OSItem[]; onChange: (items: OSItem[]) => void; hint?: string }) {
    const [pricing, setPricing] = useState<PricingData | null>(null)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        let alive = true
        loadPricing().then(p => { if (alive) setPricing(p) })
        return () => { alive = false }
    }, [])

    if (!pricing) return null
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-primary/10 text-primary text-[15px] font-semibold hover:bg-primary/15 transition-colors">
                <Calculator aria-hidden className="w-[18px] h-[18px]" /> Calcular preço
            </button>
            {open && <CalculatorSheet pricing={pricing} items={items} hint={hint} onClose={() => setOpen(false)} onApply={next => { onChange(next); setOpen(false) }} />}
        </>
    )
}

function CalculatorSheet({ pricing, items, hint, onClose, onApply }: {
    pricing: PricingData
    items: OSItem[]
    hint?: string
    onClose: () => void
    onApply: (items: OSItem[]) => void
}) {
    const parts = items.filter(i => !isLabor(i))
    const partsSell = parts.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const guess = pricing.services.find(s => hint && hint.toLowerCase().includes(s.name.toLowerCase())) ?? null

    const [service, setService] = useState<ServiceRow | null>(guess)
    const [name, setName] = useState(guess?.name ?? '')
    const [minutes, setMinutes] = useState(String(guess?.minutes ?? 60))
    const [partsCost, setPartsCost] = useState(moneyText(parts.reduce((s, i) => s + i.quantity * (i.unit_cost || 0), 0)))
    const [stats, setStats] = useState<Stats | null>(null)

    const { settings, fees, hourCost } = pricing
    const q = quote({ partsCost: parseMoney(partsCost), minutes: parseMoney(minutes), hourCost, marginPct: settings.margin_pct, taxPct: settings.tax_pct, fees })
    const current = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const currentMargin = current > 0 ? marginAt(current, q.cost, settings.tax_pct) : null
    // The table price is labor only, so the parts go on top of it.
    const tableTotal = service && service.price > 0 ? service.price + partsSell : null

    useEffect(() => {
        const term = name.trim()
        if (term.length < 3) return
        let alive = true
        const t = setTimeout(() => {
            fetch(`/api/pricing/history?q=${encodeURIComponent(term)}`)
                .then(r => (r.ok ? r.json() : null))
                .then(d => { if (alive) setStats(d) })
                .catch(() => {})
        }, 350)
        return () => { alive = false; clearTimeout(t) }
    }, [name])

    const pick = (s: ServiceRow) => {
        setService(s)
        setName(s.name)
        if (s.minutes) setMinutes(String(s.minutes))
    }

    const apply = (total: number) => {
        const labor = Math.max(0, Math.round((total - partsSell) * 100) / 100)
        const item: OSItem = {
            key: newKey(),
            inventory_item_id: null,
            item_name: `${LABOR}${name.trim() ? `: ${name.trim()}` : ''}`,
            quantity: 1,
            unit_price: labor,
            unit_cost: Math.round(q.laborCost * 100) / 100,
        }
        const kept = items.filter(i => !isLabor(i))
        onApply([...kept, item])
    }

    return (
        <Sheet
            open
            onClose={onClose}
            title="Calcular preço"
            subtitle={`Hora de bancada: ${brl(hourCost)}`}
            footer={<PrimaryButton className="w-full" onClick={() => apply(q.suggested)}>Usar {brl(q.suggested)}</PrimaryButton>}
        >
            <div className="space-y-5">
                {pricing.services.length > 0 && (
                    <Group title="Serviço da tabela">
                        <div className="p-3 flex flex-wrap gap-2">
                            {pricing.services.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => pick(s)}
                                    aria-pressed={service?.id === s.id}
                                    className={cn('h-9 px-3.5 rounded-full text-[15px] font-medium transition-colors', service?.id === s.id ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </Group>
                )}

                <Group>
                    <Field label="Serviço" htmlFor="pc-name">
                        <TextInput id="pc-name" value={name} onChange={e => { setName(e.target.value); setService(null) }} placeholder="Ex.: Troca de tela" />
                    </Field>
                    <Field label="Tempo de bancada (min)" htmlFor="pc-min">
                        <TextInput id="pc-min" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} />
                    </Field>
                    <div className="p-3">
                        <Chips ariaLabel="Tempo" options={TIMES} value={TIMES.some(t => t.value === minutes) ? minutes : ''} onChange={setMinutes} />
                    </div>
                    <Field label="Custo das peças (R$)" htmlFor="pc-parts" hint={parts.length ? 'Somado do custo das peças da OS. Ajuste se precisar.' : 'Quanto você pagou nas peças.'}>
                        <TextInput id="pc-parts" inputMode="decimal" value={partsCost} onChange={e => setPartsCost(e.target.value)} placeholder="0,00" />
                    </Field>
                </Group>

                <Group title="Preço total da OS" footer={`Custo: ${brl(q.cost)} (peças ${brl(q.partsCost)} + ${brl(q.laborCost)} de bancada). Lucro no sugerido: ${brl(q.profit)}.`}>
                    <div className="grid grid-cols-2 divide-x divide-border/60 text-center">
                        <div className="px-3 py-3">
                            <p className="text-[13px] text-muted-foreground">Mínimo</p>
                            <p className="text-[20px] font-semibold tabular-nums">{brl(q.minimum)}</p>
                            <p className="text-[12px] text-muted-foreground">abaixo disso, prejuízo</p>
                        </div>
                        <div className="px-3 py-3">
                            <p className="text-[13px] text-muted-foreground">Sugerido (Pix)</p>
                            <p className="text-[20px] font-semibold tabular-nums text-primary">{brl(q.suggested)}</p>
                            <p className="text-[12px] text-muted-foreground">lucro de {Math.round(settings.margin_pct)}%</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border/60 text-center">
                        <div className="px-3 py-3">
                            <p className="text-[13px] text-muted-foreground">Crédito à vista</p>
                            <p className="text-[17px] font-semibold tabular-nums">{brl(q.credit)}</p>
                        </div>
                        <div className="px-3 py-3">
                            <p className="text-[13px] text-muted-foreground">Parcelado</p>
                            <p className="text-[17px] font-semibold tabular-nums">{brl(q.installments)}</p>
                        </div>
                    </div>
                    {current > 0 && (
                        <div className="px-4 py-3 flex items-center justify-between text-[15px]">
                            <span className="text-muted-foreground">Na OS agora: {brl(current)}</span>
                            <span className={cn('tabular-nums', marginTone(currentMargin, settings.margin_pct))}>lucro {Math.round((currentMargin ?? 0) * 100)}%</span>
                        </div>
                    )}
                    {tableTotal != null && tableTotal !== q.suggested && (
                        <button type="button" onClick={() => apply(tableTotal)} className="w-full px-4 py-3 flex items-center justify-between text-[15px] hover:bg-foreground/[0.03]">
                            <span className="text-primary font-medium">Usar preço da tabela</span>
                            <span className="tabular-nums">{brl(tableTotal)}</span>
                        </button>
                    )}
                </Group>

                {name.trim().length >= 3 && stats && stats.count > 0 && (
                    <Group title="O que você já cobrou">
                        <div className="px-4 py-3 flex items-start gap-3">
                            <History aria-hidden className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                            <p className="text-[15px] text-pretty">
                                {stats.count} vez{stats.count > 1 ? 'es' : ''}, média de <b className="tabular-nums">{brl(stats.average ?? 0)}</b>
                                {stats.count > 1 && <> (de {brl(stats.min ?? 0)} a {brl(stats.max ?? 0)})</>}. Última: {brl(stats.last ?? 0)}.
                            </p>
                        </div>
                    </Group>
                )}
            </div>
        </Sheet>
    )
}
