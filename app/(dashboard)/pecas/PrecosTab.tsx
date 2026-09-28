'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Link2, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Field, Group, PrimaryButton, SecondaryButton, SelectRow, TextInput, brl, moneyText, parseMoney } from '@/components/ui/form'
import QuotePreview from '@/components/pecas/QuotePreview'
import { cn } from '@/lib/utils'
import { partTitle, qty, send, useData, type Part } from './shared'

interface Price {
    id: string; device_model: string; service: string; part_item_id: string | null; labor_price: number; price: number; notes: string | null
    part: { name: string; cost_price: number; quantity_in_stock: number } | null; suggested: number
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const suggest = (cost: number, labor: number, margin: number, laborMin = 0) => { const raw = cost + Math.max(cost * (margin / 100), laborMin) + labor; return raw > 0 ? Math.ceil(raw / 5) * 5 : 0 }

/** Price table by device and service; the OS fills the value from here. */
export default function PrecosTab() {
    const { data, reload } = useData<{ prices: Price[]; margin: number; laborMin: number }>('/api/parts/prices')
    const { data: partsData } = useData<{ parts: Part[] }>('/api/parts')
    const [query, setQuery] = useState('')
    const [editing, setEditing] = useState<Price | 'new' | null>(null)
    const [margin, setMargin] = useState<{ margin_pct: string; labor_min: string } | null>(null)

    const groups = useMemo(() => {
        const q = normalize(query.trim())
        const map = new Map<string, Price[]>()
        for (const p of data?.prices ?? []) {
            if (q && !normalize(`${p.device_model} ${p.service} ${p.part?.name ?? ''}`).includes(q)) continue
            const list = map.get(p.device_model) ?? []
            list.push(p)
            map.set(p.device_model, list)
        }
        return [...map.entries()]
    }, [data, query])

    const saveMargin = async () => {
        const margin_pct = Number((margin?.margin_pct ?? '').replace(',', '.'))
        const labor_min = Number((margin?.labor_min ?? '').replace(',', '.'))
        if (!Number.isFinite(margin_pct) || margin_pct < 0) return toast.error('Margem inválida')
        if (!Number.isFinite(labor_min) || labor_min < 0) return toast.error('Mão de obra mínima inválida')
        try { await send('/api/parts/prices', 'PUT', { margin_pct, labor_min }); toast.success('Salvo'); setMargin(null); reload() } catch (e) { toast.error((e as Error).message) }
    }
    const outdated = (data?.prices ?? []).filter(p => p.part && p.suggested > 0 && p.price < p.suggested).length

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <label className="flex-1 h-11 rounded-full bg-foreground/[0.06] flex items-center gap-2 px-4">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Aparelho ou serviço" className="flex-1 bg-transparent outline-none text-[17px] min-w-0" />
                </label>
                <button type="button" onClick={() => setEditing('new')} aria-label="Novo preço" className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Plus className="w-5 h-5" /></button>
            </div>

            {data && (
                <Group footer={`Preço sugerido = custo da peça + mão de obra (${data.margin}% do custo da peça, ou ${brl(data.laborMin)} no mínimo) + mão de obra fixa, arredondado para cima de R$ 5 em R$ 5.`}>
                    {margin === null ? (
                        <button type="button" onClick={() => setMargin({ margin_pct: String(data.margin), labor_min: moneyText(data.laborMin) })} className="w-full flex items-center justify-between px-4 min-h-[52px] text-left">
                            <span className="text-[17px]">Margem e mão de obra mínima</span><span className="text-[17px] text-muted-foreground">{data.margin}% · {brl(data.laborMin)}</span>
                        </button>
                    ) : (
                        <div className="flex items-end gap-2 px-4 py-3">
                            <Field label="Margem sobre a peça (%)" htmlFor="pr-margin" className="px-0 py-0 flex-1"><TextInput id="pr-margin" inputMode="decimal" value={margin.margin_pct} onChange={e => setMargin(m => ({ ...m!, margin_pct: e.target.value }))} /></Field>
                            <Field label="Mão de obra mínima (R$)" htmlFor="pr-labor-min" className="px-0 py-0 flex-1"><TextInput id="pr-labor-min" inputMode="decimal" value={margin.labor_min} onChange={e => setMargin(m => ({ ...m!, labor_min: e.target.value }))} /></Field>
                            <PrimaryButton onClick={saveMargin} className="h-10 px-4 text-[15px]">Salvar</PrimaryButton>
                        </div>
                    )}
                </Group>
            )}
            {outdated > 0 && <p className="px-4 text-[14px] text-amber-700 dark:text-amber-400">{outdated} {outdated === 1 ? 'preço está' : 'preços estão'} abaixo do sugerido. A peça pode ter ficado mais cara.</p>}

            {!data ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                : groups.length === 0 ? (
                    <p className="text-center text-[15px] text-muted-foreground py-10">{data.prices.length ? 'Nada encontrado.' : 'Monte sua tabela: aparelho + serviço + peça. Na OS o valor já aparece preenchido.'}</p>
                ) : groups.map(([model, list]) => (
                    <section key={model} className="space-y-1.5">
                        <h3 className="px-4 text-[13px] font-medium text-muted-foreground">{model}</h3>
                        <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                            {list.map(p => (
                                <button key={p.id} type="button" onClick={() => setEditing(p)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]">
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[17px] truncate">{p.service}</span>
                                        <span className="block text-[13px] text-muted-foreground truncate">
                                            {p.part ? `${p.part.name} (${brl(p.part.cost_price)}${p.part.quantity_in_stock <= 0 ? ' · sem estoque' : ` · ${qty(p.part.quantity_in_stock)} em estoque`})` : 'Sem peça'}{p.labor_price ? ` + mão de obra ${brl(p.labor_price)}` : ''}
                                        </span>
                                    </span>
                                    <span className="text-right shrink-0">
                                        <span className="block text-[17px] font-semibold tabular-nums">{brl(p.price)}</span>
                                        {p.suggested > 0 && p.suggested !== p.price && <span className={cn('block text-[12px] tabular-nums', p.price < p.suggested ? 'text-amber-600' : 'text-muted-foreground')}>sugerido {brl(p.suggested)}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}

            <PriceForm open={!!editing} price={editing === 'new' ? null : editing} parts={partsData?.parts ?? []} margin={data?.margin ?? 80} laborMin={data?.laborMin ?? 0} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
        </div>
    )
}

function PriceForm({ open, price, parts, margin, laborMin, onClose, onSaved }: { open: boolean; price: Price | null; parts: Part[]; margin: number; laborMin: number; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({ device_model: '', service: '', part_item_id: '', labor: '', price: '' })
    const [saving, setSaving] = useState(false)
    const [quote, setQuote] = useState<{ url: string; message: string; whatsapp_url?: string } | null>(null)
    const [generating, setGenerating] = useState(false)
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    useEffect(() => {
        if (!open) return

        setF(price ? { device_model: price.device_model, service: price.service, part_item_id: price.part_item_id ?? '', labor: moneyText(price.labor_price), price: moneyText(price.price) } : { device_model: '', service: '', part_item_id: '', labor: '', price: '' })
        setQuote(null)
        setCustomerName('')
        setCustomerPhone('')
    }, [open, price])

    const generateQuote = async () => {
        setGenerating(true)
        try {
            const d = await send<{ url: string; message: string; whatsapp_url?: string }>('/api/parts/quotes', 'POST', {
                device_model: f.device_model.trim(), service: f.service.trim(),
                customer_name: customerName.trim() || null, customer_phone: customerPhone.trim() || null,
            })
            setQuote(d)
        } catch (e) { toast.error((e as Error).message) } finally { setGenerating(false) }
    }
    const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
    const part = parts.find(p => p.id === f.part_item_id)
    const sug = suggest(Number(part?.cost_price) || 0, parseMoney(f.labor), margin, laborMin)
    // Parts for this device first.
    const options = useMemo(() => {
        const m = normalize(f.device_model)
        return [...parts].sort((a, b) => Number(!!m && !normalize(`${b.name} ${b.device_model ?? ''}`).includes(m)) - Number(!!m && !normalize(`${a.name} ${a.device_model ?? ''}`).includes(m)))
            .map(p => ({ value: p.id, label: `${partTitle(p)} · ${brl(Number(p.cost_price) || 0)}` }))
    }, [parts, f.device_model])

    const save = async () => {
        if (!f.device_model.trim()) return toast.error('Informe o aparelho.')
        if (f.service.trim().length < 2) return toast.error('Informe o serviço.')
        setSaving(true)
        try {
            const body = { device_model: f.device_model.trim(), service: f.service.trim(), part_item_id: f.part_item_id || null, labor_price: parseMoney(f.labor), price: parseMoney(f.price) || sug }
            await send(price ? `/api/parts/prices/${price.id}` : '/api/parts/prices', price ? 'PATCH' : 'POST', body)
            toast.success('Preço salvo')
            onSaved()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }
    const remove = async () => {
        if (!price) return
        try { await send(`/api/parts/prices/${price.id}`, 'DELETE'); toast.success('Preço removido'); onSaved() } catch (e) { toast.error((e as Error).message) }
    }

    return (
        <Sheet open={open} onClose={onClose} title={price ? 'Editar preço' : 'Novo preço'} footer={
            <div className="flex gap-2">
                {price && <SecondaryButton onClick={remove} aria-label="Remover" className="text-red-600"><Trash2 className="w-5 h-5" /></SecondaryButton>}
                <PrimaryButton onClick={save} disabled={saving} className="flex-1">{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton>
            </div>
        }>
            <div className="space-y-5">
                <div tabIndex={-1} data-autofocus />
                <Group>
                    <Field label="Aparelho" htmlFor="pf-model"><TextInput id="pf-model" value={f.device_model} onChange={e => set('device_model', e.target.value)} placeholder="Ex.: iPhone 13" /></Field>
                    <Field label="Serviço" htmlFor="pf-service"><TextInput id="pf-service" value={f.service} onChange={e => set('service', e.target.value)} placeholder="Ex.: Troca de tela, Troca de bateria" /></Field>
                    <SelectRow id="pf-part" label="Peça" value={f.part_item_id} onChange={v => set('part_item_id', v)} placeholder="Sem peça" options={options} />
                </Group>
                <Group footer={sug > 0 ? <>Sugerido: <button type="button" onClick={() => set('price', moneyText(sug))} className="text-primary font-medium">{brl(sug)}</button> (peça {brl(Number(part?.cost_price) || 0)} + mão de obra {brl(Math.max((Number(part?.cost_price) || 0) * (margin / 100), laborMin))})</> : undefined}>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Mão de obra (R$)" htmlFor="pf-labor"><TextInput id="pf-labor" inputMode="decimal" value={f.labor} onChange={e => set('labor', e.target.value)} placeholder="0,00" /></Field>
                        <Field label="Preço ao cliente (R$)" htmlFor="pf-price"><TextInput id="pf-price" inputMode="decimal" value={f.price} onChange={e => set('price', e.target.value)} placeholder={sug ? moneyText(sug) : '0,00'} /></Field>
                    </div>
                </Group>

                {price && (
                    <Group title="Orçamento pro cliente" footer="Junta todas as opções de qualidade desse aparelho e serviço numa página só, pra mandar em vez de digitar o valor.">
                        <div className="grid grid-cols-2 divide-x divide-border/60">
                            <Field label="Nome (opcional)" htmlFor="pf-cname"><TextInput id="pf-cname" value={customerName} onChange={e => setCustomerName(e.target.value)} /></Field>
                            <Field label="WhatsApp (opcional)" htmlFor="pf-cphone"><TextInput id="pf-cphone" type="tel" inputMode="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(11) 98888-7777" /></Field>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                            <SecondaryButton onClick={generateQuote} disabled={generating} className="w-full h-10 text-[15px]">
                                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Gerar link de orçamento
                            </SecondaryButton>
                            {quote && <QuotePreview message={quote.message} whatsappUrl={quote.whatsapp_url} />}
                        </div>
                    </Group>
                )}
            </div>
        </Sheet>
    )
}
