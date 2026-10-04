'use client'

import { useState } from 'react'
import { Copy, Plug, Plus, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { api, Button, dateTime, Empty, fieldCls, FieldRow, Notice, Panel, Spinner, StatusPill, Toggle, useLoad } from './ui'

interface Hook { id: string; name: string; url: string; events: string[]; enabled: boolean; has_secret: boolean }
interface Log { id: string; event: string; status_code: number | null; ok: boolean; error: string | null; created_at: string }
interface Payload { webhooks: Hook[]; events: { value: string; label: string }[] }

/** Avisa outro sistema (CRM, n8n, Zapier, planilha) a cada evento do WhatsApp. O corpo vai assinado (HMAC-SHA256). */
export default function WebhooksView() {
    const { data, error, reload } = useLoad<Payload>('/api/alice/webhooks')
    const [creating, setCreating] = useState(false)
    const [form, setForm] = useState({ name: '', url: '', events: ['message.received'] as string[] })
    const [busy, setBusy] = useState(false)
    const [secret, setSecret] = useState<string | null>(null)
    const [logs, setLogs] = useState<{ hook: Hook; rows: Log[] } | null>(null)
    const [removing, setRemoving] = useState<Hook | null>(null)

    const create = async () => {
        setBusy(true)
        try {
            const r = await api<{ secret: string }>('/api/alice/webhooks', { method: 'POST', body: form })
            setCreating(false)
            setSecret(r.secret)
            reload()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }
    const toggle = async (h: Hook, enabled: boolean) => { try { await api(`/api/alice/webhooks/${h.id}`, { method: 'PUT', body: { enabled } }); reload() } catch (err) { toast.error((err as Error).message) } }
    const test = async (h: Hook) => {
        try {
            const r = await api<{ ok: boolean; status: number | null; error: string | null }>(`/api/alice/webhooks/${h.id}/test`, { method: 'POST' })
            if (r.ok) toast.success(`Teste enviado (resposta ${r.status})`); else toast.error(`Falhou: ${r.error}`)
        } catch (err) { toast.error((err as Error).message) }
    }
    const showLogs = async (h: Hook) => { try { setLogs({ hook: h, rows: (await api<{ logs: Log[] }>(`/api/alice/webhooks/${h.id}/logs`)).logs }) } catch (err) { toast.error((err as Error).message) } }
    const remove = async () => {
        const h = removing
        setRemoving(null)
        if (!h) return
        try { await api(`/api/alice/webhooks/${h.id}`, { method: 'DELETE' }); reload() } catch (err) { toast.error((err as Error).message) }
    }
    const label = (v: string) => data?.events.find(e => e.value === v)?.label ?? v

    return (
        <div className="space-y-4">
            <Notice>Cada evento chega como <code>POST</code> JSON: <code>{'{ event, timestamp, data }'}</code>. Se o seu sistema valida a origem, confira o cabeçalho <code>X-Nexus-Signature: sha256=…</code> (HMAC-SHA256 do corpo com a chave mostrada ao criar). Só endereços públicos são aceitos.</Notice>
            <Panel title="Webhooks" description="Integre com CRM, n8n, Zapier, Make…" action={<Button onClick={() => { setForm({ name: '', url: '', events: ['message.received'] }); setCreating(true) }}><Plus className="w-4 h-4" /> Novo</Button>}>
                {error ? <p className="px-5 pb-5 text-[14px] text-red-600">{error}</p> : !data ? <Spinner /> : data.webhooks.length === 0 ? (
                    <Empty icon={<Plug className="w-5 h-5" />}>Nenhum webhook. Crie um para receber cada mensagem em outro sistema.</Empty>
                ) : (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                        {data.webhooks.map(h => (
                            <li key={h.id} className="px-5 py-3 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold truncate">{h.name}</p><p className="text-[12px] text-muted-foreground truncate">{h.url}</p></div>
                                    <Toggle checked={h.enabled} onChange={v => toggle(h, v)} label={`Ativar ${h.name}`} />
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {h.events.map(e => <StatusPill key={e} tone="gray">{label(e)}</StatusPill>)}
                                    <span className="flex-1" />
                                    <button type="button" onClick={() => test(h)} className="h-8 px-3 rounded-full bg-foreground/[0.07] text-[13px] font-semibold inline-flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Testar</button>
                                    <button type="button" onClick={() => showLogs(h)} className="h-8 px-3 rounded-full bg-foreground/[0.07] text-[13px] font-semibold">Histórico</button>
                                    <button type="button" onClick={() => setRemoving(h)} aria-label="Apagar" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {creating && data && (
                <Sheet open onClose={() => setCreating(false)} title="Novo webhook">
                    <div className="space-y-4">
                        <FieldRow label="Nome"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="ex.: Meu CRM" className={fieldCls} /></FieldRow>
                        <FieldRow label="Endereço (URL)"><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} inputMode="url" placeholder="https://…" className={fieldCls} /></FieldRow>
                        <div className="space-y-2">
                            <p className="text-[13px] font-medium text-muted-foreground">Avisar quando</p>
                            {data.events.map(e => (
                                <label key={e.value} className="flex items-center gap-3 text-[15px]">
                                    <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.events.includes(e.value)} onChange={ev => setForm({ ...form, events: ev.target.checked ? [...form.events, e.value] : form.events.filter(x => x !== e.value) })} />
                                    {e.label}
                                </label>
                            ))}
                        </div>
                        <Button busy={busy} disabled={!form.name.trim() || !form.url.trim() || !form.events.length} onClick={create} className="w-full h-12 text-[17px]">Criar webhook</Button>
                    </div>
                </Sheet>
            )}
            {secret && (
                <Sheet open onClose={() => setSecret(null)} title="Guarde esta chave">
                    <div className="space-y-4">
                        <p className="text-[14px] text-muted-foreground">Ela assina cada envio. <b>Aparece só agora</b>: copie e guarde no seu sistema.</p>
                        <code className="block break-all rounded-xl bg-foreground/[0.06] p-3 text-[13px]">{secret}</code>
                        <Button onClick={() => { navigator.clipboard.writeText(secret).then(() => toast.success('Chave copiada')).catch(() => toast.error('Não foi possível copiar')) }} className="w-full"><Copy className="w-4 h-4" /> Copiar chave</Button>
                    </div>
                </Sheet>
            )}
            {logs && (
                <Sheet open onClose={() => setLogs(null)} title={`Histórico · ${logs.hook.name}`}>
                    {logs.rows.length === 0 ? <p className="text-[14px] text-muted-foreground">Nenhum envio ainda.</p> : (
                        <ul className="divide-y divide-border/60">
                            {logs.rows.map(l => <li key={l.id} className="py-2.5 flex items-center gap-2 text-[14px]"><StatusPill tone={l.ok ? 'green' : 'red'}>{l.ok ? 'OK' : 'Erro'}</StatusPill><span className="flex-1 truncate">{label(l.event)}{l.error && <span className="text-red-600"> · {l.error}</span>}</span><span className="text-[12px] text-muted-foreground">{dateTime(l.created_at)}</span></li>)}
                        </ul>
                    )}
                </Sheet>
            )}
            {removing && <PremiumConfirmDialog isOpen title="Apagar webhook?" description={`“${removing.name}” deixa de receber eventos.`} confirmLabel="Apagar" variant="danger" onConfirm={remove} onCancel={() => setRemoving(null)} />}
        </div>
    )
}
