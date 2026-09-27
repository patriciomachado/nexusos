'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowDown, ArrowUp, Loader2, MapPin, Minus, Plus, Search, Trash2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, SelectRow, SwitchRow, TextInput, brl, moneyText, parseMoney } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { QUALITIES, REASONS, partTitle, qty, qualityLabel, send, stockState, useData, type Part, type Supplier } from './shared'

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function StockPill({ p }: { p: Pick<Part, 'quantity_in_stock' | 'minimum_quantity'> }) {
    const st = stockState(p)
    return (
        <span className={cn('h-7 min-w-[44px] px-2 rounded-full inline-flex items-center justify-center text-[14px] font-semibold tabular-nums',
            st === 'out' ? 'bg-red-500/12 text-red-700 dark:text-red-400' : st === 'low' ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400')}>
            {qty(p.quantity_in_stock)}
        </span>
    )
}

/** Parts on the shelf: search, filter what's short, open one to manage it. */
export default function EstoqueTab({ suppliers }: { suppliers: Supplier[] }) {
    const { data, reload } = useData<{ parts: Part[] }>('/api/parts')
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'short'>('all')
    const [editing, setEditing] = useState<Part | 'new' | null>(null)
    const [openId, setOpenId] = useState<string | null>(null)

    const list = useMemo(() => {
        const q = normalize(query.trim())
        return (data?.parts ?? []).filter(p => {
            if (filter === 'short' && stockState(p) === 'ok') return false
            return !q || normalize(`${p.name} ${p.device_model ?? ''} ${p.sku ?? ''} ${p.location ?? ''} ${p.suppliers?.name ?? ''}`).includes(q)
        })
    }, [data, query, filter])
    const shortCount = (data?.parts ?? []).filter(p => stockState(p) !== 'ok').length

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <label className="flex-1 h-11 rounded-full bg-foreground/[0.06] flex items-center gap-2 px-4">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Peça, aparelho, gaveta…" className="flex-1 bg-transparent outline-none text-[17px] min-w-0" />
                </label>
                <button type="button" onClick={() => setEditing('new')} aria-label="Nova peça" className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Plus className="w-5 h-5" /></button>
            </div>
            <Chips ariaLabel="Filtro" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Todas' }, { value: 'short', label: `Em falta ou no mínimo${shortCount ? ` (${shortCount})` : ''}` }]} />

            {!data ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : list.length === 0 ? (
                <p className="text-center text-[15px] text-muted-foreground py-10">{data.parts.length ? 'Nada encontrado.' : 'Nenhuma peça cadastrada ainda. Toque em + para cadastrar.'}</p>
            ) : (
                <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                    {list.map(p => (
                        <button key={p.id} type="button" onClick={() => setOpenId(p.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]">
                            <span className="flex-1 min-w-0">
                                <span className="block text-[17px] truncate">{partTitle(p)}</span>
                                <span className="block text-[13px] text-muted-foreground truncate">
                                    {[qualityLabel(p.part_quality), p.location ? `📍 ${p.location}` : null, brl(Number(p.cost_price) || 0), p.suppliers?.name].filter(Boolean).join(' · ')}
                                </span>
                            </span>
                            <StockPill p={p} />
                        </button>
                    ))}
                </div>
            )}

            <PartForm open={!!editing} part={editing === 'new' ? null : editing} suppliers={suppliers} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
            <PartDetail id={openId} suppliers={suppliers} onClose={() => setOpenId(null)} onChanged={reload} onEdit={p => { setOpenId(null); setEditing(p) }} />
        </div>
    )
}

function PartForm({ open, part, suppliers, onClose, onSaved }: { open: boolean; part: Part | null; suppliers: Supplier[]; onClose: () => void; onSaved: () => void }) {
    const blank = { name: '', device_model: '', part_quality: '' as string, location: '', cost: '', price: '', min: '1', qty: '', supplier_id: '', sku: '' }
    const [f, setF] = useState(blank)
    const [saving, setSaving] = useState(false)
    useEffect(() => {
        if (!open) return
        // Fill the form each time it opens (new or editing).
         
        setF(part ? {
            name: part.name, device_model: part.device_model ?? '', part_quality: part.part_quality ?? '', location: part.location ?? '',
            cost: moneyText(Number(part.cost_price) || 0), price: moneyText(Number(part.selling_price) || 0), min: String(Number(part.minimum_quantity) || 0),
            qty: '', supplier_id: part.supplier_id ?? '', sku: part.sku ?? '',
        } : blank)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, part])
    const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))

    const save = async () => {
        if (f.name.trim().length < 2) return toast.error('Informe o nome da peça.')
        setSaving(true)
        try {
            const body = {
                name: f.name.trim(), device_model: f.device_model.trim() || null, part_quality: f.part_quality || null, location: f.location.trim() || null,
                cost_price: parseMoney(f.cost), selling_price: parseMoney(f.price), minimum_quantity: Number(f.min.replace(',', '.')) || 0,
                supplier_id: f.supplier_id || null, sku: f.sku.trim() || null,
                ...(part ? {} : { quantity: Number(f.qty.replace(',', '.')) || 0 }),
            }
            await send(part ? `/api/parts/${part.id}` : '/api/parts', part ? 'PATCH' : 'POST', body)
            toast.success(part ? 'Peça atualizada' : 'Peça cadastrada')
            onSaved()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }

    return (
        <Sheet open={open} onClose={onClose} title={part ? 'Editar peça' : 'Nova peça'} footer={<PrimaryButton onClick={save} disabled={saving} className="w-full">{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton>}>
            <div className="space-y-5">
                <div tabIndex={-1} data-autofocus />
                <Group>
                    <Field label="Peça" htmlFor="pt-name"><TextInput id="pt-name" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Ex.: Tela, Bateria, Conector de carga" /></Field>
                    <Field label="Aparelho" htmlFor="pt-model"><TextInput id="pt-model" value={f.device_model} onChange={e => set('device_model', e.target.value)} placeholder="Ex.: iPhone 13, Galaxy A54" /></Field>
                    <div className="px-4 py-3">
                        <p className="text-[13px] text-muted-foreground mb-2">Qualidade</p>
                        <Chips ariaLabel="Qualidade" value={f.part_quality} onChange={v => set('part_quality', f.part_quality === v ? '' : v)} options={QUALITIES.map(q => ({ value: q.value, label: q.label }))} />
                    </div>
                    <Field label="Onde fica" htmlFor="pt-loc"><TextInput id="pt-loc" value={f.location} onChange={e => set('location', e.target.value)} placeholder="Ex.: Gaveta A2, Caixa das telas" /></Field>
                </Group>
                <Group title="Valores e estoque">
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Custo (R$)" htmlFor="pt-cost"><TextInput id="pt-cost" inputMode="decimal" value={f.cost} onChange={e => set('cost', e.target.value)} placeholder="0,00" /></Field>
                        <Field label="Preço avulso (R$)" htmlFor="pt-price"><TextInput id="pt-price" inputMode="decimal" value={f.price} onChange={e => set('price', e.target.value)} placeholder="0,00" /></Field>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Estoque mínimo" htmlFor="pt-min" hint="Abaixo disso entra na lista de compras."><TextInput id="pt-min" inputMode="numeric" value={f.min} onChange={e => set('min', e.target.value)} /></Field>
                        {!part && <Field label="Tenho agora" htmlFor="pt-qty"><TextInput id="pt-qty" inputMode="numeric" value={f.qty} onChange={e => set('qty', e.target.value)} placeholder="0" /></Field>}
                    </div>
                    <SelectRow id="pt-sup" label="Fornecedor" value={f.supplier_id} onChange={v => set('supplier_id', v)} placeholder="Nenhum" options={suppliers.map(s => ({ value: s.id, label: s.name }))} />
                    <Field label="Código (opcional)" htmlFor="pt-sku"><TextInput id="pt-sku" value={f.sku} onChange={e => set('sku', e.target.value)} placeholder="SKU ou código do fornecedor" /></Field>
                </Group>
            </div>
        </Sheet>
    )
}

interface Detail {
    part: Part & { suppliers?: { name: string; phone: string | null } | null }
    movements: { id: string; quantity: number; reason: string; notes: string | null; created_at: string; users?: { full_name?: string } | null }[]
    quotes: { id: string; price: number; source: string; created_at: string; supplier_id: string; suppliers?: { name: string } | null }[]
    defects: { id: string; quantity: number; reason: string | null; resolution: string; created_at: string }[]
}

function PartDetail({ id, suppliers, onClose, onChanged, onEdit }: { id: string | null; suppliers: Supplier[]; onClose: () => void; onChanged: () => void; onEdit: (p: Part) => void }) {
    const [d, setD] = useState<Detail | null>(null)
    const [tick, setTick] = useState(0)
    const [mode, setMode] = useState<'adjust' | 'quote' | 'defect' | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (!id) return
        let alive = true
        fetch(`/api/parts/${id}`).then(r => r.json()).then(x => { if (alive && x.part) setD(x) }).catch(() => toast.error('Não foi possível abrir a peça'))
        return () => { alive = false }
    }, [id, tick])
    const refresh = () => { setTick(t => t + 1); onChanged() }
    const view = d && d.part.id === id ? d : null

    // Latest price per supplier, cheapest first, with the previous one for the trend.
    const prices = useMemo(() => {
        const by = new Map<string, { supplier: string; price: number; prev: number | null; at: string }>()
        for (const q of [...(view?.quotes ?? [])].reverse()) {
            const cur = by.get(q.supplier_id)
            by.set(q.supplier_id, { supplier: q.suppliers?.name ?? 'Fornecedor', price: Number(q.price), prev: cur ? cur.price : null, at: q.created_at })
        }
        return [...by.values()].sort((a, b) => a.price - b.price)
    }, [view])

    const remove = async () => {
        try { await send(`/api/parts/${id}`, 'DELETE'); toast.success('Peça arquivada'); setConfirmDelete(false); onClose(); onChanged() } catch (e) { toast.error((e as Error).message) }
    }

    return (
        <Sheet open={!!id} onClose={() => { setMode(null); onClose() }} title={view ? partTitle(view.part) : 'Peça'} subtitle={view ? [qualityLabel(view.part.part_quality), view.part.location].filter(Boolean).join(' · ') || undefined : undefined} size="lg">
            {!view ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : (
                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-foreground/[0.04] p-3"><p className="text-[12px] text-muted-foreground">Em estoque</p><p className={cn('text-[22px] font-semibold tabular-nums', stockState(view.part) === 'out' ? 'text-red-600' : stockState(view.part) === 'low' ? 'text-amber-600' : '')}>{qty(view.part.quantity_in_stock)}</p></div>
                        <div className="rounded-2xl bg-foreground/[0.04] p-3"><p className="text-[12px] text-muted-foreground">Mínimo</p><p className="text-[22px] font-semibold tabular-nums">{qty(view.part.minimum_quantity)}</p></div>
                        <div className="rounded-2xl bg-foreground/[0.04] p-3"><p className="text-[12px] text-muted-foreground">Custo</p><p className="text-[17px] leading-[33px] font-semibold tabular-nums truncate">{brl(Number(view.part.cost_price) || 0)}</p></div>
                    </div>
                    {view.part.location && <p className="flex items-center gap-1.5 text-[15px] text-muted-foreground"><MapPin className="w-4 h-4" /> {view.part.location}</p>}

                    <div className="grid grid-cols-3 gap-2">
                        <SecondaryButton onClick={() => setMode(mode === 'adjust' ? null : 'adjust')} className="h-11 px-2 text-[15px]">Ajustar</SecondaryButton>
                        <SecondaryButton onClick={() => setMode(mode === 'quote' ? null : 'quote')} className="h-11 px-2 text-[15px]">Cotação</SecondaryButton>
                        <SecondaryButton onClick={() => setMode(mode === 'defect' ? null : 'defect')} className="h-11 px-2 text-[15px]">Defeito</SecondaryButton>
                    </div>
                    {mode === 'adjust' && <AdjustForm id={view.part.id} onDone={() => { setMode(null); refresh() }} />}
                    {mode === 'quote' && <QuoteForm id={view.part.id} suppliers={suppliers} onDone={() => { setMode(null); refresh() }} />}
                    {mode === 'defect' && <DefectForm part={view.part} suppliers={suppliers} onDone={() => { setMode(null); refresh() }} />}

                    <section className="space-y-1.5">
                        <h3 className="px-4 text-[13px] font-medium text-muted-foreground">Preço por fornecedor</h3>
                        <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                            {prices.length === 0 ? <p className="px-4 py-3.5 text-[15px] text-muted-foreground">Registre cotações para comparar quem vende mais barato.</p> : prices.map((p, i) => (
                                <div key={p.supplier} className="flex items-center gap-3 px-4 py-3">
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[17px] truncate">{p.supplier}</span>
                                        <span className="block text-[13px] text-muted-foreground">{new Date(p.at).toLocaleDateString('pt-BR')}</span>
                                    </span>
                                    {i === 0 && prices.length > 1 && <span className="text-[12px] font-semibold px-2 h-6 rounded-full inline-flex items-center bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">Mais barato</span>}
                                    {p.prev != null && p.prev !== p.price && (p.price > p.prev
                                        ? <span className="inline-flex items-center text-[13px] text-red-600"><ArrowUp className="w-3.5 h-3.5" />{Math.round(((p.price - p.prev) / (p.prev || 1)) * 100)}%</span>
                                        : <span className="inline-flex items-center text-[13px] text-emerald-600"><ArrowDown className="w-3.5 h-3.5" />{Math.round(((p.prev - p.price) / (p.prev || 1)) * 100)}%</span>)}
                                    <span className="text-[17px] font-semibold tabular-nums">{brl(p.price)}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-1.5">
                        <h3 className="px-4 text-[13px] font-medium text-muted-foreground">Movimentações</h3>
                        <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                            {view.movements.length === 0 ? <p className="px-4 py-3.5 text-[15px] text-muted-foreground">Nenhuma movimentação ainda.</p> : view.movements.map(m => (
                                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[15px] truncate">{REASONS[m.reason] ?? m.reason}{m.notes ? ` · ${m.notes}` : ''}</span>
                                        <span className="block text-[12px] text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{m.users?.full_name ? ` · ${m.users.full_name}` : ''}</span>
                                    </span>
                                    <span className={cn('text-[15px] font-semibold tabular-nums', Number(m.quantity) > 0 ? 'text-emerald-600' : 'text-red-600')}>{Number(m.quantity) > 0 ? '+' : ''}{qty(m.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {view.defects.length > 0 && (
                        <p className="flex items-center gap-2 px-1 text-[14px] text-amber-700 dark:text-amber-400"><AlertTriangle className="w-4 h-4" /> {view.defects.reduce((a, x) => a + Number(x.quantity), 0)} com defeito registradas. Veja na aba Defeitos.</p>
                    )}

                    <div className="flex gap-2">
                        <SecondaryButton onClick={() => setConfirmDelete(true)} aria-label="Arquivar peça" className="text-red-600"><Trash2 className="w-5 h-5" /></SecondaryButton>
                        <PrimaryButton onClick={() => onEdit(view.part)} className="flex-1">Editar peça</PrimaryButton>
                    </div>
                </div>
            )}
            <PremiumConfirmDialog isOpen={confirmDelete} onCancel={() => setConfirmDelete(false)} onConfirm={remove} title="Arquivar peça?" description="Ela sai do estoque e das listas. As OS antigas continuam com o histórico." confirmLabel="Arquivar" variant="danger" />
        </Sheet>
    )
}

function AdjustForm({ id, onDone }: { id: string; onDone: () => void }) {
    const [dir, setDir] = useState<'in' | 'out'>('in')
    const [n, setN] = useState(1)
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)
    const save = async () => {
        setSaving(true)
        try { await send(`/api/parts/${id}/stock`, 'POST', { quantity: dir === 'in' ? n : -n, notes: note.trim() || null }); toast.success('Estoque ajustado'); onDone() }
        catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }
    return (
        <Group>
            <div className="px-4 py-3 flex items-center justify-between gap-3">
                <Chips ariaLabel="Tipo" value={dir} onChange={setDir} options={[{ value: 'in', label: 'Entrou' }, { value: 'out', label: 'Saiu' }]} />
                <span className="inline-flex items-center rounded-full bg-foreground/[0.06]">
                    <button type="button" onClick={() => setN(Math.max(1, n - 1))} className="w-10 h-10 flex items-center justify-center" aria-label="Menos"><Minus className="w-4 h-4" /></button>
                    <span className="min-w-[2ch] text-center text-[17px] tabular-nums">{n}</span>
                    <button type="button" onClick={() => setN(n + 1)} className="w-10 h-10 flex items-center justify-center" aria-label="Mais"><Plus className="w-4 h-4" /></button>
                </span>
            </div>
            <Field label="Motivo" htmlFor="adj-note"><TextInput id="adj-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: contagem da gaveta, perdeu" /></Field>
            <div className="px-4 py-3"><PrimaryButton onClick={save} disabled={saving} className="w-full h-11">Confirmar</PrimaryButton></div>
        </Group>
    )
}

function QuoteForm({ id, suppliers, onDone }: { id: string; suppliers: Supplier[]; onDone: () => void }) {
    const [sid, setSid] = useState('')
    const [price, setPrice] = useState('')
    const [saving, setSaving] = useState(false)
    const save = async () => {
        if (!sid) return toast.error('Escolha o fornecedor.')
        if (!parseMoney(price)) return toast.error('Informe o preço.')
        setSaving(true)
        try { await send(`/api/parts/${id}/quotes`, 'POST', { supplier_id: sid, price: parseMoney(price) }); toast.success('Cotação registrada'); onDone() }
        catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }
    if (!suppliers.length) return <p className="px-1 text-[15px] text-muted-foreground">Cadastre um fornecedor na aba Fornecedores primeiro.</p>
    return (
        <Group>
            <SelectRow id="qt-sup" label="Fornecedor" value={sid} onChange={setSid} options={suppliers.map(s => ({ value: s.id, label: s.name }))} />
            <Field label="Preço cobrado (R$)" htmlFor="qt-price"><TextInput id="qt-price" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" /></Field>
            <div className="px-4 py-3"><PrimaryButton onClick={save} disabled={saving} className="w-full h-11">Salvar cotação</PrimaryButton></div>
        </Group>
    )
}

export function DefectForm({ part, suppliers, onDone }: { part: Pick<Part, 'id' | 'supplier_id'>; suppliers: Supplier[]; onDone: () => void }) {
    const [sid, setSid] = useState(part.supplier_id ?? '')
    const [n, setN] = useState(1)
    const [reason, setReason] = useState('')
    const [take, setTake] = useState(true)
    const [saving, setSaving] = useState(false)
    const save = async () => {
        setSaving(true)
        try { await send('/api/parts/defects', 'POST', { inventory_item_id: part.id, supplier_id: sid || null, quantity: n, reason: reason.trim() || null, take_from_stock: take }); toast.success('Defeito registrado'); onDone() }
        catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }
    return (
        <Group>
            <SelectRow id="df-sup" label="Fornecedor" value={sid} onChange={setSid} placeholder="Não sei" options={suppliers.map(s => ({ value: s.id, label: s.name }))} />
            <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-[17px]">Quantidade</span>
                <span className="inline-flex items-center rounded-full bg-foreground/[0.06]">
                    <button type="button" onClick={() => setN(Math.max(1, n - 1))} className="w-10 h-10 flex items-center justify-center" aria-label="Menos"><Minus className="w-4 h-4" /></button>
                    <span className="min-w-[2ch] text-center text-[17px] tabular-nums">{n}</span>
                    <button type="button" onClick={() => setN(n + 1)} className="w-10 h-10 flex items-center justify-center" aria-label="Mais"><Plus className="w-4 h-4" /></button>
                </span>
            </div>
            <Field label="O que aconteceu" htmlFor="df-reason"><TextInput id="df-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex.: touch fantasma, não carrega" /></Field>
            <SwitchRow label="Tirar do estoque" description="Ligue se a peça com defeito ainda estava na gaveta" checked={take} onChange={setTake} />
            <div className="px-4 py-3"><PrimaryButton onClick={save} disabled={saving} className="w-full h-11">Registrar defeito</PrimaryButton></div>
        </Group>
    )
}
