'use client'

import { useState } from 'react'
import { CalendarClock, Plus, Repeat, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { api, Attachment, AttachmentPicker, attachmentFields, Button, dateTime, Empty, fieldCls, FieldRow, Notice, Panel, Spinner, StatusPill, toLocalInput, useLoad } from './ui'

interface Scheduled {
    id: string
    target: string
    target_name: string | null
    content: string | null
    media_name: string | null
    media_type: string | null
    send_at: string
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
    status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
    last_error: string | null
    sent_count: number
}
interface Group { jid: string; subject: string }

const REC = { none: 'Uma vez', daily: 'Todo dia', weekly: 'Toda semana', monthly: 'Todo mês' }
const STATUS: Record<Scheduled['status'], { label: string; tone: 'green' | 'orange' | 'red' | 'gray' | 'blue' }> = {
    pending: { label: 'Agendada', tone: 'blue' }, sending: { label: 'Enviando', tone: 'orange' }, sent: { label: 'Enviada', tone: 'green' }, failed: { label: 'Falhou', tone: 'red' }, cancelled: { label: 'Cancelada', tone: 'gray' },
}

function shown(m: Scheduled) {
    return m.target_name || (m.target.endsWith('@g.us') ? 'Grupo' : m.target)
}

/** Mensagens para um número ou grupo em dia e hora certos (uma vez ou recorrentes). */
export default function SchedulerView() {
    const { data, error, reload } = useLoad<{ messages: Scheduled[] }>('/api/alice/scheduled')
    const groups = useLoad<{ groups: Group[] }>('/api/alice/groups')
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [removing, setRemoving] = useState<Scheduled | null>(null)
    const [form, setForm] = useState({ kind: 'phone' as 'phone' | 'group', phone: '', group: '', name: '', content: '', when: '', recurrence: 'none' as Scheduled['recurrence'], attachment: null as Attachment | null })

    const start = () => {
        const d = new Date(Date.now() + 60 * 60_000)
        d.setMinutes(0, 0, 0)
        setForm({ kind: 'phone', phone: '', group: '', name: '', content: '', when: toLocalInput(d), recurrence: 'none', attachment: null })
        setOpen(true)
    }

    const save = async () => {
        setBusy(true)
        try {
            await api('/api/alice/scheduled', {
                method: 'POST',
                body: {
                    target: form.kind === 'group' ? form.group : form.phone,
                    target_name: form.kind === 'group' ? groups.data?.groups.find(g => g.jid === form.group)?.subject ?? null : form.name.trim() || null,
                    content: form.content.trim() || null,
                    send_at: new Date(form.when).toISOString(),
                    recurrence: form.recurrence,
                    ...attachmentFields(form.attachment),
                },
            })
            setOpen(false)
            toast.success('Mensagem agendada')
            reload()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const cancel = async () => {
        const m = removing
        setRemoving(null)
        if (!m) return
        try { await api(`/api/alice/scheduled/${m.id}`, { method: 'DELETE' }); toast.success('Agendamento cancelado'); reload() } catch (err) { toast.error((err as Error).message) }
    }

    const ready = (form.kind === 'group' ? !!form.group : form.phone.replace(/\D/g, '').length >= 10) && !!form.when && (!!form.content.trim() || !!form.attachment)

    return (
        <div className="space-y-4">
            <Notice>As mensagens saem pelo WhatsApp da loja no horário marcado (conferido a cada minuto). O WhatsApp precisa estar conectado nesse momento.</Notice>
            <Panel title="Agendador" description="Lembretes, promoções e avisos nos horários certos." action={<Button onClick={start}><Plus className="w-4 h-4" /> Agendar</Button>}>
                {error ? <p className="px-5 pb-5 text-[14px] text-red-600">{error}</p> : !data ? <Spinner /> : data.messages.length === 0 ? (
                    <Empty icon={<CalendarClock className="w-5 h-5" />}>Nada agendado. Programe, por exemplo, o aviso de promoção da sexta-feira.</Empty>
                ) : (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                        {data.messages.map(m => (
                            <li key={m.id} className="px-5 py-3 flex items-center gap-3">
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-[15px] font-semibold truncate">{shown(m)}</p>
                                    <p className="text-[13px] text-muted-foreground truncate">{m.content || `Anexo: ${m.media_name ?? m.media_type}`}</p>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        <StatusPill tone={STATUS[m.status].tone}>{STATUS[m.status].label}</StatusPill>
                                        <StatusPill tone="gray">{dateTime(m.send_at)}</StatusPill>
                                        {m.recurrence !== 'none' && <StatusPill tone="gray"><Repeat className="w-3 h-3 mr-1" />{REC[m.recurrence]}</StatusPill>}
                                        {m.sent_count > 0 && <StatusPill tone="green">{m.sent_count}× enviada</StatusPill>}
                                    </div>
                                    {m.last_error && <p className="text-[12px] text-red-600">{m.last_error}</p>}
                                </div>
                                {(m.status === 'pending' || m.status === 'failed') && <button type="button" onClick={() => setRemoving(m)} aria-label="Cancelar agendamento" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06] hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {open && (
                <Sheet open onClose={() => setOpen(false)} title="Agendar mensagem">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {(['phone', 'group'] as const).map(k => (
                                <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })} className={`flex-1 h-10 rounded-full text-[14px] font-semibold ${form.kind === k ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.07]'}`}>{k === 'phone' ? 'Para um número' : 'Para um grupo'}</button>
                            ))}
                        </div>
                        {form.kind === 'phone' ? (
                            <>
                                <FieldRow label="WhatsApp (com DDD)"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="48 99999-9999" className={fieldCls} /></FieldRow>
                                <FieldRow label="Nome (opcional)"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={120} className={fieldCls} /></FieldRow>
                            </>
                        ) : (
                            <FieldRow label="Grupo" hint={groups.data?.groups.length ? undefined : 'Nenhum grupo ainda: abra a aba Grupos e toque em Atualizar.'}>
                                <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} className={fieldCls}>
                                    <option value="">Escolha…</option>
                                    {groups.data?.groups.map(g => <option key={g.jid} value={g.jid}>{g.subject}</option>)}
                                </select>
                            </FieldRow>
                        )}
                        <FieldRow label="Mensagem"><textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} maxLength={4000} className={fieldCls} /></FieldRow>
                        <AttachmentPicker value={form.attachment} onChange={a => setForm({ ...form, attachment: a })} />
                        <div className="grid grid-cols-2 gap-3">
                            <FieldRow label="Enviar em"><input type="datetime-local" value={form.when} onChange={e => setForm({ ...form, when: e.target.value })} className={fieldCls} /></FieldRow>
                            <FieldRow label="Repetir">
                                <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value as Scheduled['recurrence'] })} className={fieldCls}>
                                    {Object.entries(REC).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </FieldRow>
                        </div>
                        <Button busy={busy} disabled={!ready} onClick={save} className="w-full h-12 text-[17px]">Agendar</Button>
                    </div>
                </Sheet>
            )}
            {removing && <PremiumConfirmDialog isOpen title="Cancelar este agendamento?" description="A mensagem não será mais enviada." confirmLabel="Cancelar envio" variant="danger" onConfirm={cancel} onCancel={() => setRemoving(null)} />}
        </div>
    )
}
