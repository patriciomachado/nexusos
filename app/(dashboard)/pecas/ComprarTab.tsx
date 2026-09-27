'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, MessageCircle, Minus, PackageCheck, Plus, Truck, X } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Field, Group, PrimaryButton, SecondaryButton, SelectRow, TextInput, brl, moneyText, parseMoney } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { partTitle, qty, qualityLabel, send, useData, waLink, type Supplier } from './shared'

interface SuggestItem { part_id: string; name: string; device_model: string | null; part_quality: string | null; stock: number; minimum: number; on_order: number; need: number; unit_cost: number; waiting_os: { id: string; order_number: string; title: string }[] }
interface Suggest { supplier: { id: string; name: string; phone: string | null } | null; items: SuggestItem[]; total: number }
interface OrderLine { id: string; inventory_item_id: string; quantity: number; unit_cost: number; inventory_items?: { name: string; device_model: string | null } | null }
interface Order { id: string; status: 'aberto' | 'enviado' | 'recebido' | 'cancelado'; notes: string | null; total: number; created_at: string; sent_at: string | null; received_at: string | null; supplier_id: string | null; suppliers?: { name: string; phone: string | null } | null; part_order_items: OrderLine[] }

const STATUS: Record<Order['status'], { label: string; cls: string }> = {
    aberto: { label: 'Rascunho', cls: 'bg-foreground/[0.07] text-muted-foreground' },
    enviado: { label: 'A caminho', cls: 'bg-sky-500/12 text-sky-700 dark:text-sky-400' },
    recebido: { label: 'Recebido', cls: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' },
    cancelado: { label: 'Cancelado', cls: 'bg-red-500/10 text-red-600' },
}

function orderText(supplier: string | null | undefined, lines: { name: string; quality?: string | null; quantity: number }[]) {
    return [
        `Olá${supplier ? `, ${supplier}` : ''}! Gostaria de fazer um pedido:`,
        '',
        ...lines.map(l => `• ${qty(l.quantity)}x ${l.name}${l.quality ? ` (${qualityLabel(l.quality)})` : ''}`),
        '',
        'Pode me confirmar valores e prazo? Obrigado!',
    ].join('\n')
}

/** Opens WhatsApp right away (before any await) so the phone doesn't block the popup. */
function openWhatsApp(link: string) {
    const w = window.open(link, '_blank')
    if (!w) window.location.assign(link)
}

/** What to buy (grouped by supplier) and the orders on the way. */
export default function ComprarTab({ suppliers }: { suppliers: Supplier[] }) {
    const { data: sug, reload: reloadSug } = useData<{ groups: Suggest[] }>('/api/parts/shopping')
    const { data: ord, reload: reloadOrders } = useData<{ orders: Order[] }>('/api/parts/orders')
    const [receiving, setReceiving] = useState<Order | null>(null)
    const [ready, setReady] = useState<{ id: string; order_number: string; title: string }[] | null>(null)
    const reloadAll = () => { reloadSug(); reloadOrders() }

    const act = async (o: Order, action: 'enviar' | 'cancelar') => {
        if (action === 'enviar') {
            const text = orderText(o.suppliers?.name, o.part_order_items.map(l => ({ name: l.inventory_items ? partTitle(l.inventory_items) : 'Peça', quantity: l.quantity })))
            openWhatsApp(waLink(o.suppliers?.phone, text))
        }
        try { await send(`/api/parts/orders/${o.id}`, 'PATCH', { action }); reloadAll() } catch (e) { toast.error((e as Error).message) }
    }

    const active = (ord?.orders ?? []).filter(o => o.status === 'aberto' || o.status === 'enviado')
    const done = (ord?.orders ?? []).filter(o => o.status === 'recebido' || o.status === 'cancelado').slice(0, 15)

    return (
        <div className="space-y-6">
            <section className="space-y-2">
                <h3 className="px-4 text-[13px] font-medium text-muted-foreground">Precisa comprar</h3>
                {!sug ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                    : sug.groups.length === 0 ? (
                        <div className="rounded-2xl bg-card border border-border/60 p-5 text-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-[17px] font-semibold">Estoque em dia</p>
                            <p className="text-[15px] text-muted-foreground">Nenhuma peça abaixo do mínimo nem OS esperando peça sem pedido.</p>
                        </div>
                    ) : sug.groups.map(g => <SuggestCard key={`${g.supplier?.id ?? 'none'}:${g.items.map(i => `${i.part_id}-${i.need}`).join(',')}`} group={g} suppliers={suppliers} onOrdered={reloadAll} />)}
            </section>

            {active.length > 0 && (
                <section className="space-y-2">
                    <h3 className="px-4 text-[13px] font-medium text-muted-foreground">Pedidos em andamento</h3>
                    {active.map(o => (
                        <div key={o.id} className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-sky-500 shrink-0" />
                                <p className="flex-1 min-w-0 text-[17px] font-semibold truncate">{o.suppliers?.name ?? 'Sem fornecedor'}</p>
                                <span className={cn('h-6 px-2 rounded-full text-[12px] font-semibold inline-flex items-center', STATUS[o.status].cls)}>{STATUS[o.status].label}</span>
                            </div>
                            <ul className="text-[15px] space-y-0.5">
                                {o.part_order_items.map(l => <li key={l.id} className="flex justify-between gap-3"><span className="truncate">{qty(l.quantity)}× {l.inventory_items ? partTitle(l.inventory_items) : 'Peça'}</span><span className="text-muted-foreground tabular-nums">{brl(Number(l.unit_cost) * Number(l.quantity))}</span></li>)}
                            </ul>
                            <p className="text-[13px] text-muted-foreground">{new Date(o.sent_at ?? o.created_at).toLocaleDateString('pt-BR')} · total {brl(Number(o.total) || 0)}</p>
                            <div className="flex gap-2">
                                <SecondaryButton onClick={() => act(o, 'cancelar')} aria-label="Cancelar pedido" className="h-11 w-11 px-0"><X className="w-5 h-5" /></SecondaryButton>
                                {o.status === 'aberto' && <SecondaryButton onClick={() => act(o, 'enviar')} className="h-11 flex-1 text-[15px]"><MessageCircle className="w-4 h-4" /> Enviar</SecondaryButton>}
                                <PrimaryButton onClick={() => setReceiving(o)} className="h-11 flex-1 text-[15px]"><PackageCheck className="w-4 h-4" /> Recebi</PrimaryButton>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {done.length > 0 && (
                <section className="space-y-1.5">
                    <h3 className="px-4 text-[13px] font-medium text-muted-foreground">Últimos pedidos</h3>
                    <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                        {done.map(o => (
                            <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[17px] truncate">{o.suppliers?.name ?? 'Sem fornecedor'}</span>
                                    <span className="block text-[13px] text-muted-foreground truncate">{new Date(o.received_at ?? o.created_at).toLocaleDateString('pt-BR')} · {o.part_order_items.length} {o.part_order_items.length === 1 ? 'item' : 'itens'}</span>
                                </span>
                                <span className={cn('h-6 px-2 rounded-full text-[12px] font-semibold inline-flex items-center', STATUS[o.status].cls)}>{STATUS[o.status].label}</span>
                                <span className="text-[15px] tabular-nums">{brl(Number(o.total) || 0)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <ReceiveSheet order={receiving} onClose={() => setReceiving(null)} onDone={r => { setReceiving(null); reloadAll(); if (r.length) setReady(r) }} />
            <Sheet open={!!ready} onClose={() => setReady(null)} title="Peças chegaram" subtitle="Estas OS estavam esperando e podem continuar">
                <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                    {(ready ?? []).map(o => (
                        <Link key={o.id} href={`/service-orders/${o.id}`} className="flex items-center gap-3 px-4 min-h-[52px]">
                            <span className="text-[15px] font-semibold tabular-nums">{o.order_number}</span>
                            <span className="flex-1 min-w-0 text-[17px] truncate">{o.title}</span>
                            <span className="text-[15px] text-primary">Abrir</span>
                        </Link>
                    ))}
                </div>
            </Sheet>
        </div>
    )
}

function SuggestCard({ group, suppliers, onOrdered }: { group: Suggest; suppliers: Supplier[]; onOrdered: () => void }) {
    const [lines, setLines] = useState(group.items.map(i => ({ ...i, quantity: i.need, include: true })))
    const [sid, setSid] = useState(group.supplier?.id ?? '')
    const [saving, setSaving] = useState(false)
    const supplier = group.supplier ?? suppliers.find(s => s.id === sid) ?? null
    const chosen = lines.filter(l => l.include && l.quantity > 0)
    const total = chosen.reduce((a, l) => a + l.quantity * l.unit_cost, 0)

    const order = async (viaWhatsApp: boolean) => {
        if (!chosen.length) return toast.error('Marque ao menos uma peça.')
        if (viaWhatsApp) openWhatsApp(waLink(supplier?.phone, orderText(supplier?.name, chosen.map(l => ({ name: partTitle(l), quality: l.part_quality, quantity: l.quantity })))))
        setSaving(true)
        try {
            await send('/api/parts/orders', 'POST', {
                supplier_id: supplier?.id ?? null,
                status: viaWhatsApp ? 'enviado' : 'aberto',
                items: chosen.map(l => ({ inventory_item_id: l.part_id, quantity: l.quantity, unit_cost: l.unit_cost, service_order_id: l.waiting_os[0]?.id ?? null })),
            })
            toast.success(viaWhatsApp ? 'Pedido enviado e salvo' : 'Pedido salvo')
            onOrdered()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }

    return (
        <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
            <div className="px-4 pt-3.5 pb-2">
                {group.supplier ? <p className="text-[17px] font-semibold">{group.supplier.name}</p> : (
                    <>
                        <p className="text-[17px] font-semibold">Sem fornecedor definido</p>
                        <p className="text-[13px] text-muted-foreground">Escolha de quem comprar ou defina o fornecedor na peça.</p>
                    </>
                )}
            </div>
            {!group.supplier && <div className="border-t border-border/60"><SelectRow id={`sg-${group.items[0]?.part_id}`} label="Fornecedor" value={sid} onChange={setSid} placeholder="Escolher" options={suppliers.map(s => ({ value: s.id, label: s.name }))} /></div>}
            <div className="divide-y divide-border/60 border-t border-border/60">
                {lines.map((l, i) => (
                    <div key={l.part_id} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-start gap-3">
                            <input type="checkbox" checked={l.include} onChange={e => setLines(ls => ls.map((x, k) => k === i ? { ...x, include: e.target.checked } : x))} className="mt-1 w-5 h-5 accent-[var(--color-primary)]" aria-label={`Incluir ${l.name}`} />
                            <span className="flex-1 min-w-0">
                                <span className="block text-[17px] truncate">{partTitle(l)}</span>
                                <span className={cn('block text-[13px]', l.stock < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                                    {l.stock < 0 ? `Faltando ${qty(-l.stock)} para OS` : `Tem ${qty(l.stock)}, mínimo ${qty(l.minimum)}`}{l.on_order > 0 ? ` · ${qty(l.on_order)} já pedidas` : ''} · {brl(l.unit_cost)} un
                                </span>
                            </span>
                            <span className="inline-flex items-center rounded-full bg-foreground/[0.06] shrink-0">
                                <button type="button" onClick={() => setLines(ls => ls.map((x, k) => k === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))} className="w-9 h-9 flex items-center justify-center" aria-label="Menos"><Minus className="w-4 h-4" /></button>
                                <span className="min-w-[2ch] text-center text-[16px] tabular-nums">{l.quantity}</span>
                                <button type="button" onClick={() => setLines(ls => ls.map((x, k) => k === i ? { ...x, quantity: x.quantity + 1 } : x))} className="w-9 h-9 flex items-center justify-center" aria-label="Mais"><Plus className="w-4 h-4" /></button>
                            </span>
                        </div>
                        {l.waiting_os.length > 0 && (
                            <div className="pl-8 flex flex-wrap gap-1.5">
                                {l.waiting_os.map(o => <Link key={o.id} href={`/service-orders/${o.id}`} className="h-6 px-2 rounded-full bg-orange-500/12 text-orange-700 dark:text-orange-300 text-[12px] font-medium inline-flex items-center">{o.order_number} esperando</Link>)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="px-4 py-3 border-t border-border/60 space-y-2.5">
                <p className="flex justify-between text-[15px]"><span className="text-muted-foreground">Estimado</span><span className="font-semibold tabular-nums">{brl(total)}</span></p>
                <div className="flex gap-2">
                    <SecondaryButton onClick={() => order(false)} disabled={saving} className="h-11 flex-1 text-[15px]">Salvar pedido</SecondaryButton>
                    <PrimaryButton onClick={() => order(true)} disabled={saving || !supplier} className="h-11 flex-1 text-[15px]">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} WhatsApp</PrimaryButton>
                </div>
            </div>
        </div>
    )
}

function ReceiveSheet({ order, onClose, onDone }: { order: Order | null; onClose: () => void; onDone: (ready: { id: string; order_number: string; title: string }[]) => void }) {
    const [lines, setLines] = useState<{ id: string; name: string; quantity: string; cost: string }[]>([])
    const [saving, setSaving] = useState(false)
    useEffect(() => {
        if (!order) return
         
        setLines(order.part_order_items.map(l => ({ id: l.id, name: l.inventory_items ? partTitle(l.inventory_items) : 'Peça', quantity: qty(l.quantity), cost: moneyText(Number(l.unit_cost) || 0) })))
    }, [order])

    const save = async () => {
        if (!order) return
        setSaving(true)
        try {
            const r = await send<{ ready_os: { id: string; order_number: string; title: string }[] }>(`/api/parts/orders/${order.id}`, 'PATCH', {
                action: 'receber',
                items: lines.map(l => ({ id: l.id, quantity: Number(l.quantity.replace(',', '.')) || 0, unit_cost: parseMoney(l.cost) })),
            })
            toast.success('Peças no estoque')
            onDone(r.ready_os ?? [])
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }

    return (
        <Sheet open={!!order} onClose={onClose} title="Receber pedido" subtitle={order?.suppliers?.name ?? undefined} footer={<PrimaryButton onClick={save} disabled={saving} className="w-full">{saving && <Loader2 className="w-5 h-5 animate-spin" />}Colocar no estoque</PrimaryButton>}>
            <div className="space-y-4">
                <div tabIndex={-1} data-autofocus />
                <p className="px-1 text-[15px] text-muted-foreground">Confira o que chegou e o preço pago. O custo das peças é atualizado e o preço fica no histórico do fornecedor.</p>
                {lines.map((l, i) => (
                    <Group key={l.id} title={l.name}>
                        <div className="grid grid-cols-2 divide-x divide-border/60">
                            <Field label="Chegou" htmlFor={`rc-q-${l.id}`}><TextInput id={`rc-q-${l.id}`} inputMode="numeric" value={l.quantity} onChange={e => setLines(ls => ls.map((x, k) => k === i ? { ...x, quantity: e.target.value } : x))} /></Field>
                            <Field label="Custo unitário (R$)" htmlFor={`rc-c-${l.id}`}><TextInput id={`rc-c-${l.id}`} inputMode="decimal" value={l.cost} onChange={e => setLines(ls => ls.map((x, k) => k === i ? { ...x, cost: e.target.value } : x))} /></Field>
                        </div>
                    </Group>
                ))}
            </div>
        </Sheet>
    )
}
