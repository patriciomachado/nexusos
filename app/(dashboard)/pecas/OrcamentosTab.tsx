'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ClipboardPlus, Copy, Link2, Loader2, MessageCircle, Trash2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { Field, PrimaryButton, SecondaryButton, TextInput, brl } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { send, useData } from './shared'

interface Option { tipo: string | null; valor: number }
interface Quote {
    id: string; device_model: string; service: string; options: Option[]
    valid_until: string; created_at: string; status: 'aberto' | 'convertido' | 'vencido'
    order_number: string | null; link: string; follow_up_message: string | null
}
interface Stats { total: number; converted: number; open: number; expired: number; rate: number | null }

const STATUS: Record<Quote['status'], { label: string; className: string }> = {
    aberto: { label: 'Em aberto', className: 'bg-blue-500/12 text-blue-700 dark:text-blue-400' },
    convertido: { label: 'Convertido', className: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' },
    vencido: { label: 'Vencido', className: 'bg-amber-500/12 text-amber-700 dark:text-amber-400' },
}

/** Orçamentos gerados (Alice ou orçamento rápido): quais viraram OS, e o que ainda tá parado. */
export default function OrcamentosTab() {
    const { data, reload } = useData<{ quotes: Quote[]; stats: Stats }>('/api/parts/quotes')
    const [converting, setConverting] = useState<Quote | null>(null)
    const [deleting, setDeleting] = useState<Quote | null>(null)
    const [removing, setRemoving] = useState(false)

    const stats = data?.stats

    const confirmDelete = async () => {
        if (!deleting) return
        setRemoving(true)
        try {
            await send(`/api/parts/quotes/${deleting.id}`, 'DELETE')
            toast.success('Orçamento apagado')
            setDeleting(null)
            reload()
        } catch (e) { toast.error((e as Error).message) } finally { setRemoving(false) }
    }

    return (
        <div className="space-y-4">
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Tile label="Total" value={stats.total} />
                    <Tile label="Convertidos" value={stats.converted} sub={stats.rate != null ? `${Math.round(stats.rate * 100)}%` : undefined} />
                    <Tile label="Em aberto" value={stats.open} />
                    <Tile label="Vencidos" value={stats.expired} />
                </div>
            )}

            {!data ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : data.quotes.length === 0 ? (
                <p className="text-center text-[15px] text-muted-foreground py-10">Nenhum orçamento gerado ainda. Use &ldquo;Cotar&rdquo; no dashboard ou a Alice no WhatsApp.</p>
            ) : (
                <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                    {data.quotes.map(q => (
                        <div key={q.id} className="px-4 py-3 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <span className="min-w-0">
                                    <span className="block text-[16px] font-medium truncate">{q.device_model}</span>
                                    <span className="block text-[13px] text-muted-foreground truncate">{q.service} · {new Date(q.created_at).toLocaleDateString('pt-BR')}</span>
                                </span>
                                <span className="flex items-center gap-2 shrink-0">
                                    <span className={cn('h-6 px-2.5 rounded-full text-[12px] font-semibold inline-flex items-center', STATUS[q.status].className)}>
                                        {q.status === 'convertido' && q.order_number ? q.order_number : STATUS[q.status].label}
                                    </span>
                                    <button type="button" onClick={() => setDeleting(q)} aria-label="Apagar orçamento" className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </span>
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                                {q.options.map(o => `${o.tipo ?? q.service}: ${brl(o.valor)}`).join(' · ')}
                            </p>
                            {q.status === 'aberto' && (
                                <div className="space-y-2 pt-1">
                                    <Link href={`/service-orders/new?quote_id=${q.id}`} className="w-full h-9 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold flex items-center justify-center gap-1.5">
                                        <ClipboardPlus className="w-3.5 h-3.5" /> Criar OS a partir deste orçamento
                                    </Link>
                                    <div className="flex gap-2">
                                        <SecondaryButton onClick={() => { navigator.clipboard?.writeText(q.follow_up_message ?? ''); toast.success('Lembrete copiado') }} className="flex-1 h-9 text-[13px]">
                                            <Copy className="w-3.5 h-3.5" /> Copiar lembrete
                                        </SecondaryButton>
                                        <a href={`https://wa.me/?text=${encodeURIComponent(q.follow_up_message ?? '')}`} target="_blank" rel="noreferrer" className="flex-1 h-9 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium flex items-center justify-center gap-1.5">
                                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                        </a>
                                        <SecondaryButton onClick={() => setConverting(q)} className="h-9 px-3 text-[13px]"><Link2 className="w-3.5 h-3.5" /></SecondaryButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ConvertSheet quote={converting} onClose={() => setConverting(null)} onDone={() => { setConverting(null); reload() }} />
            <PremiumConfirmDialog
                isOpen={!!deleting}
                title="Apagar orçamento?"
                description={deleting ? `${deleting.device_model} · ${deleting.service}. O link deixa de funcionar e o lembrete pendente é cancelado.` : ''}
                confirmLabel={removing ? 'Apagando…' : 'Apagar'}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
            />
        </div>
    )
}

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 p-3">
            <p className="text-[12px] text-muted-foreground">{label}</p>
            <p className="text-[22px] font-semibold tabular-nums leading-tight">{value}{sub && <span className="text-[13px] text-muted-foreground font-normal ml-1">({sub})</span>}</p>
        </div>
    )
}

function ConvertSheet({ quote, onClose, onDone }: { quote: Quote | null; onClose: () => void; onDone: () => void }) {
    const [orderNumber, setOrderNumber] = useState('')
    const [saving, setSaving] = useState(false)

    const save = async () => {
        if (!quote) return
        if (!orderNumber.trim()) return toast.error('Informe o número da OS.')
        setSaving(true)
        try {
            await send(`/api/parts/quotes/${quote.id}`, 'PATCH', { order_number: orderNumber.trim() })
            toast.success('Orçamento vinculado à OS')
            onDone()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }

    return (
        <Sheet open={!!quote} onClose={onClose} title="Vincular a uma OS" footer={<PrimaryButton onClick={save} disabled={saving} className="w-full">{saving && <Loader2 className="w-5 h-5 animate-spin" />}Vincular</PrimaryButton>}>
            <div className="space-y-5">
                <div tabIndex={-1} data-autofocus />
                <p className="px-1 text-[14px] text-muted-foreground">
                    Se você já abriu a OS sem usar o campo &ldquo;veio de um orçamento&rdquo;, vincule aqui pra contar na estatística.
                </p>
                <Field label="Número da OS" htmlFor="cv-order"><TextInput id="cv-order" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="Ex.: OS-00042" /></Field>
            </div>
        </Sheet>
    )
}
