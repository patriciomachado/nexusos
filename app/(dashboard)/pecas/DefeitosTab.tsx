'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Plus } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Chips, Group, SelectRow, brl } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { DefectForm } from './EstoqueTab'
import { partTitle, qty, qualityLabel, send, useData, type Part, type Supplier } from './shared'

interface Defect {
    id: string; quantity: number; reason: string | null; resolution: 'pendente' | 'trocada' | 'devolvida' | 'prejuizo'; cost: number; created_at: string
    suppliers?: { name: string } | null; inventory_items?: { name: string; device_model: string | null; part_quality: string | null } | null; service_orders?: { order_number: string } | null
    service_order_id: string | null
}

const RES: Record<Defect['resolution'], { label: string; cls: string }> = {
    pendente: { label: 'Aguardando fornecedor', cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
    trocada: { label: 'Trocada', cls: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' },
    devolvida: { label: 'Dinheiro devolvido', cls: 'bg-sky-500/12 text-sky-700 dark:text-sky-400' },
    prejuizo: { label: 'Prejuízo', cls: 'bg-red-500/10 text-red-600' },
}

/** Defective parts: what failed, from whom, and how the supplier handled it. */
export default function DefeitosTab({ suppliers }: { suppliers: Supplier[] }) {
    const { data, reload } = useData<{ defects: Defect[]; by_quality: { quality: string; quantity: number; loss: number }[] }>('/api/parts/defects')
    const { data: partsData } = useData<{ parts: Part[] }>('/api/parts')
    const [filter, setFilter] = useState<'pendente' | 'all'>('pendente')
    const [adding, setAdding] = useState(false)
    const [partId, setPartId] = useState('')
    const part = partsData?.parts.find(p => p.id === partId)

    const resolve = async (id: string, resolution: 'trocada' | 'devolvida' | 'prejuizo') => {
        try { await send(`/api/parts/defects/${id}`, 'PATCH', { resolution }); toast.success(resolution === 'trocada' ? 'Peça nova voltou para o estoque' : 'Atualizado'); reload() } catch (e) { toast.error((e as Error).message) }
    }

    if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    const list = data.defects.filter(d => filter === 'all' || d.resolution === 'pendente')
    const pending = data.defects.filter(d => d.resolution === 'pendente').length

    return (
        <div className="space-y-4">
            <button type="button" onClick={() => { setPartId(''); setAdding(true) }} className="w-full h-12 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Registrar defeito</button>

            {data.by_quality.length > 0 && (
                <section className="space-y-1.5">
                    <h3 className="px-4 text-[13px] font-medium text-muted-foreground">Defeitos por qualidade da peça</h3>
                    <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                        {data.by_quality.map(q => (
                            <div key={q.quality} className="flex items-center gap-3 px-4 py-3">
                                <span className="flex-1 text-[17px] capitalize">{qualityLabel(q.quality) || q.quality}</span>
                                {q.loss > 0 && <span className="text-[13px] text-red-600 tabular-nums">prejuízo {brl(q.loss)}</span>}
                                <span className="text-[15px] font-semibold tabular-nums">{qty(q.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <p className="px-4 text-[13px] text-muted-foreground">A taxa de defeito de cada fornecedor está na aba Fornecedores.</p>
                </section>
            )}

            <Chips ariaLabel="Mostrar" value={filter} onChange={setFilter} options={[{ value: 'pendente', label: `Sem resposta${pending ? ` (${pending})` : ''}` }, { value: 'all', label: 'Todos' }]} />

            {list.length === 0 ? <p className="text-center text-[15px] text-muted-foreground py-8">{filter === 'pendente' ? 'Nenhum defeito esperando o fornecedor.' : 'Nenhum defeito registrado.'}</p> : (
                <div className="space-y-2.5">
                    {list.map(d => (
                        <div key={d.id} className="rounded-2xl bg-card border border-border/60 p-4 space-y-2">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[17px] font-medium truncate">{qty(d.quantity)}× {d.inventory_items ? partTitle(d.inventory_items) : 'Peça'}</span>
                                    <span className="block text-[13px] text-muted-foreground truncate">
                                        {[d.suppliers?.name ?? 'Fornecedor não informado', new Date(d.created_at).toLocaleDateString('pt-BR'), d.reason].filter(Boolean).join(' · ')}
                                    </span>
                                    {d.service_orders?.order_number && d.service_order_id && <Link href={`/service-orders/${d.service_order_id}`} className="text-[13px] text-primary">{d.service_orders.order_number}</Link>}
                                </span>
                                <span className={cn('h-6 px-2 rounded-full text-[12px] font-semibold inline-flex items-center shrink-0', RES[d.resolution].cls)}>{RES[d.resolution].label}</span>
                            </div>
                            {d.resolution === 'pendente' && (
                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    <button type="button" onClick={() => resolve(d.id, 'trocada')} className="h-10 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 text-[14px] font-medium">Trocou</button>
                                    <button type="button" onClick={() => resolve(d.id, 'devolvida')} className="h-10 rounded-full bg-sky-500/12 text-sky-700 dark:text-sky-400 text-[14px] font-medium">Devolveu $</button>
                                    <button type="button" onClick={() => resolve(d.id, 'prejuizo')} className="h-10 rounded-full bg-red-500/10 text-red-600 text-[14px] font-medium">Prejuízo</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Sheet open={adding} onClose={() => setAdding(false)} title="Registrar defeito">
                <div className="space-y-4">
                    <div tabIndex={-1} data-autofocus />
                    <Group>
                        <SelectRow id="df-part" label="Peça" value={partId} onChange={setPartId} placeholder="Escolher" options={(partsData?.parts ?? []).map(p => ({ value: p.id, label: partTitle(p) }))} />
                    </Group>
                    {part && <DefectForm key={part.id} part={part} suppliers={suppliers} onDone={() => { setAdding(false); reload() }} />}
                </div>
            </Sheet>
        </div>
    )
}
