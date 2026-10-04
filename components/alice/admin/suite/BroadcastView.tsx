'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, Megaphone, Pause, Play, Plus, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import Sheet from '@/components/tasks/Sheet'
import { api, Attachment, AttachmentPicker, attachmentFields, Button, dateTime, Empty, fieldCls, FieldRow, Notice, Panel, Spinner, StatusPill, useLoad } from './ui'

interface Broadcast {
    id: string
    title: string | null
    message: string
    total: number
    sent: number
    failed: number
    status: 'running' | 'paused' | 'completed' | 'cancelled'
    delay_min_seconds: number
    delay_max_seconds: number
    created_at: string
}
interface Recipient { id: string; phone: string; name: string | null; status: 'pending' | 'sending' | 'sent' | 'failed'; error: string | null }

const STATUS: Record<Broadcast['status'], { label: string; tone: 'green' | 'orange' | 'red' | 'gray' | 'blue' }> = {
    running: { label: 'Enviando', tone: 'blue' }, paused: { label: 'Pausado', tone: 'orange' }, completed: { label: 'Concluído', tone: 'green' }, cancelled: { label: 'Cancelado', tone: 'gray' },
}
type Audience = 'customers' | 'contacts' | 'numbers'

/** Disparo seguro: um por vez, com pausa aleatória entre mensagens para proteger o número da loja. */
export default function BroadcastView() {
    const { data, error, reload } = useLoad<{ broadcasts: Broadcast[] }>('/api/alice/broadcasts')
    const [creating, setCreating] = useState(false)
    const [detail, setDetail] = useState<string | null>(null)

    // Progress moves on its own while something is running.
    const running = data?.broadcasts.some(b => b.status === 'running')
    useEffect(() => {
        if (!running) return
        const t = setInterval(reload, 5000)
        return () => clearInterval(t)
    }, [running, reload])

    if (detail) return <Detail id={detail} onBack={() => { setDetail(null); reload() }} />

    return (
        <div className="space-y-4">
            <Notice tone="warn"><div className="flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0 text-orange-600" /><p>O WhatsApp pode bloquear números que mandam mensagem em massa. Por segurança, o disparo vai <b>um contato por vez</b>, com pausa aleatória (padrão 10–30 s), pula contatos bloqueados e aceita até 1.000 pessoas. Mande só para quem já é cliente.</p></div></Notice>
            <Panel title="Disparos" description="Promoções e avisos para vários clientes de uma vez." action={<Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> Novo disparo</Button>}>
                {error ? <p className="px-5 pb-5 text-[14px] text-red-600">{error}</p> : !data ? <Spinner /> : data.broadcasts.length === 0 ? (
                    <Empty icon={<Megaphone className="w-5 h-5" />}>Nenhum disparo ainda. Use <b>{'{nome}'}</b> na mensagem para chamar cada cliente pelo primeiro nome.</Empty>
                ) : (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                        {data.broadcasts.map(b => {
                            const done = b.sent + b.failed
                            return (
                                <li key={b.id}>
                                    <button type="button" onClick={() => setDetail(b.id)} className="w-full text-left px-5 py-3 space-y-1.5 hover:bg-foreground/[0.03]">
                                        <span className="flex items-center gap-2">
                                            <span className="text-[15px] font-semibold truncate flex-1">{b.title || b.message}</span>
                                            <StatusPill tone={STATUS[b.status].tone}>{STATUS[b.status].label}</StatusPill>
                                        </span>
                                        <span className="block h-1.5 rounded-full bg-foreground/[0.08] overflow-hidden"><span className="block h-full bg-primary" style={{ width: `${b.total ? (done / b.total) * 100 : 0}%` }} /></span>
                                        <span className="block text-[12px] text-muted-foreground">{b.sent} enviadas{b.failed ? ` · ${b.failed} falharam` : ''} · {b.total} no total · {dateTime(b.created_at)}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Panel>
            {creating && <Create onClose={() => setCreating(false)} onCreated={id => { setCreating(false); reload(); setDetail(id) }} />}
        </div>
    )
}

function Create({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
    const [audience, setAudience] = useState<Audience>('customers')
    const [numbers, setNumbers] = useState('')
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [attachment, setAttachment] = useState<Attachment | null>(null)
    const [min, setMin] = useState(10)
    const [max, setMax] = useState(30)
    const [busy, setBusy] = useState(false)

    const send = async () => {
        setBusy(true)
        try {
            const res = await api<{ broadcast: Broadcast }>('/api/alice/broadcasts', {
                method: 'POST',
                body: {
                    title: title.trim() || null, message, delay_min_seconds: min, delay_max_seconds: max,
                    audience: audience === 'numbers' ? { kind: 'numbers', numbers: numbers.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean) } : { kind: audience },
                    ...attachmentFields(attachment),
                },
            })
            toast.success(`Disparo iniciado para ${res.broadcast.total} pessoas`)
            onCreated(res.broadcast.id)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open onClose={onClose} title="Novo disparo" size="lg">
            <div className="space-y-4">
                <FieldRow label="Para quem">
                    <select value={audience} onChange={e => setAudience(e.target.value as Audience)} className={fieldCls}>
                        <option value="customers">Todos os clientes cadastrados (com telefone)</option>
                        <option value="contacts">Todos os contatos do WhatsApp (não bloqueados)</option>
                        <option value="numbers">Uma lista de números que vou colar</option>
                    </select>
                </FieldRow>
                {audience === 'numbers' && <FieldRow label="Números (um por linha, com DDD)"><textarea value={numbers} onChange={e => setNumbers(e.target.value)} rows={4} placeholder={'48 99999-9999\n11 98888-7777'} className={fieldCls} /></FieldRow>}
                <FieldRow label="Nome do disparo (só para você)"><input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="ex.: Promoção de película" className={fieldCls} /></FieldRow>
                <FieldRow label="Mensagem" hint="Use {nome} para o primeiro nome do cliente."><textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} maxLength={4000} placeholder="Oi, {nome}! Esta semana…" className={fieldCls} /></FieldRow>
                <AttachmentPicker value={attachment} onChange={setAttachment} />
                <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Pausa mínima (s)"><input type="number" min={3} max={600} value={min} onChange={e => setMin(Number(e.target.value) || 3)} className={fieldCls} /></FieldRow>
                    <FieldRow label="Pausa máxima (s)"><input type="number" min={3} max={900} value={max} onChange={e => setMax(Number(e.target.value) || 3)} className={fieldCls} /></FieldRow>
                </div>
                <Button busy={busy} disabled={!message.trim() || max < min || (audience === 'numbers' && !numbers.trim())} onClick={send} className="w-full h-12 text-[17px]">Iniciar disparo</Button>
            </div>
        </Sheet>
    )
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
    const [state, setState] = useState<{ broadcast: Broadcast; recipients: Recipient[] } | null>(null)
    const [busy, setBusy] = useState(false)
    const load = useCallback(async () => { try { setState(await api(`/api/alice/broadcasts/${id}`)) } catch (err) { toast.error((err as Error).message) } }, [id])

    useEffect(() => {
        load()
        const t = setInterval(load, 4000)
        return () => clearInterval(t)
    }, [load])

    const act = async (action: 'pause' | 'resume' | 'cancel') => {
        setBusy(true)
        try { await api(`/api/alice/broadcasts/${id}`, { method: 'PATCH', body: { action } }); await load() } catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
    }

    if (!state) return <Spinner />
    const { broadcast: b, recipients } = state
    const active = b.status === 'running' || b.status === 'paused'
    return (
        <div className="space-y-4">
            <button type="button" onClick={onBack} className="flex items-center gap-1 text-[15px] text-primary"><ChevronLeft className="w-4 h-4" /> Disparos</button>
            <Panel title={b.title || 'Disparo'} description={<span className="whitespace-pre-wrap">{b.message}</span>} action={<StatusPill tone={STATUS[b.status].tone}>{STATUS[b.status].label}</StatusPill>}>
                <div className="px-5 pb-4 space-y-3">
                    <div className="h-2 rounded-full bg-foreground/[0.08] overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${b.total ? ((b.sent + b.failed) / b.total) * 100 : 0}%` }} /></div>
                    <p className="text-[13px] text-muted-foreground">{b.sent} enviadas · {b.failed} falharam · {b.total - b.sent - b.failed} faltam · pausa de {b.delay_min_seconds} a {b.delay_max_seconds} s</p>
                    {active && (
                        <div className="flex gap-2">
                            {b.status === 'running' ? <Button variant="soft" busy={busy} onClick={() => act('pause')}><Pause className="w-4 h-4" /> Pausar</Button> : <Button busy={busy} onClick={() => act('resume')}><Play className="w-4 h-4" /> Continuar</Button>}
                            <Button variant="danger" busy={busy} onClick={() => act('cancel')}><X className="w-4 h-4" /> Cancelar</Button>
                        </div>
                    )}
                </div>
                <ul className="divide-y divide-border/60 border-t border-border/60 max-h-[420px] overflow-y-auto">
                    {recipients.map(r => (
                        <li key={r.id} className="px-5 py-2.5 flex items-center gap-3">
                            <span className="min-w-0 flex-1">
                                <span className="block text-[14px] font-medium truncate">{r.name || r.phone}</span>
                                {r.name && <span className="block text-[12px] text-muted-foreground">{r.phone}</span>}
                                {r.error && <span className="block text-[12px] text-red-600">{r.error}</span>}
                            </span>
                            <StatusPill tone={r.status === 'sent' ? 'green' : r.status === 'failed' ? 'red' : r.status === 'sending' ? 'orange' : 'gray'}>{{ pending: 'Na fila', sending: 'Enviando', sent: 'Enviada', failed: 'Falhou' }[r.status]}</StatusPill>
                        </li>
                    ))}
                </ul>
            </Panel>
        </div>
    )
}
