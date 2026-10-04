'use client'

import { useState } from 'react'
import { Bot, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Sheet from '@/components/tasks/Sheet'
import Segmented from '@/components/ui/Segmented'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { api, Attachment, AttachmentPicker, attachmentFields, Button, Empty, fieldCls, FieldRow, Notice, Panel, Spinner, StatusPill, Toggle, useLoad } from './ui'

interface Rule {
    id: string
    keyword: string
    match_type: 'exact' | 'contains' | 'regex'
    response: string | null
    media_url: string | null
    media_type: Attachment['type'] | null
    media_name: string | null
    trigger_type: 'all' | 'private' | 'group'
    enabled: boolean
    hits: number
}

const MATCH = { contains: 'Contém', exact: 'Igual a', regex: 'Expressão (avançado)' }
const WHERE = { private: 'Conversas', group: 'Grupos', all: 'Conversas e grupos' }

const blank = { keyword: '', match_type: 'contains' as Rule['match_type'], response: '', trigger_type: 'private' as Rule['trigger_type'], attachment: null as Attachment | null }

/** Palavra-chave → resposta fixa (com anexo opcional). Vale antes da IA: grátis e previsível. */
export default function AutoRepliesView() {
    const { data, error, reload } = useLoad<{ rules: Rule[] }>('/api/alice/autoreplies')
    const [editing, setEditing] = useState<{ id: string | null; form: typeof blank } | null>(null)
    const [busy, setBusy] = useState(false)
    const [removing, setRemoving] = useState<Rule | null>(null)

    const open = (r?: Rule) => setEditing({
        id: r?.id ?? null,
        form: r ? { keyword: r.keyword, match_type: r.match_type, response: r.response ?? '', trigger_type: r.trigger_type, attachment: r.media_url && r.media_type ? { url: r.media_url, type: r.media_type, name: r.media_name ?? 'arquivo' } : null } : blank,
    })

    const save = async () => {
        if (!editing) return
        const f = editing.form
        setBusy(true)
        try {
            const body = { keyword: f.keyword, match_type: f.match_type, response: f.response.trim() || null, trigger_type: f.trigger_type, ...attachmentFields(f.attachment) }
            await api(editing.id ? `/api/alice/autoreplies/${editing.id}` : '/api/alice/autoreplies', { method: editing.id ? 'PUT' : 'POST', body })
            setEditing(null)
            toast.success('Resposta salva')
            reload()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const toggle = async (r: Rule, enabled: boolean) => {
        try { await api(`/api/alice/autoreplies/${r.id}`, { method: 'PUT', body: { enabled } }); reload() } catch (err) { toast.error((err as Error).message) }
    }

    const remove = async () => {
        const r = removing
        setRemoving(null)
        if (!r) return
        try { await api(`/api/alice/autoreplies/${r.id}`, { method: 'DELETE' }); toast.success('Resposta apagada'); reload() } catch (err) { toast.error((err as Error).message) }
    }

    return (
        <div className="space-y-4">
            <Notice>Quando a mensagem do cliente combina com uma palavra-chave, a loja responde na hora com o texto (e o arquivo) que você definir, <b>sem gastar a IA</b>. Se nenhuma combinar, a Alice atende normalmente. Quem recebe respostas automáticas se ajusta em <b>Configuração → Regras do WhatsApp</b>.</Notice>
            <Panel title="Respostas automáticas" description="Preço de película, endereço, horário, link do Pix…" action={<Button onClick={() => open()}><Plus className="w-4 h-4" /> Nova</Button>}>
                {error ? <p className="px-5 pb-5 text-[14px] text-red-600">{error}</p> : !data ? <Spinner /> : data.rules.length === 0 ? (
                    <Empty icon={<Bot className="w-5 h-5" />}>Nenhuma resposta ainda. Crie a primeira, por exemplo: palavra “endereço” → o endereço da loja.</Empty>
                ) : (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                        {data.rules.map(r => (
                            <li key={r.id} className="px-5 py-3 flex items-center gap-3">
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-[15px] font-semibold truncate">{r.keyword}</p>
                                    <p className="text-[13px] text-muted-foreground truncate">{r.response || `Anexo: ${r.media_name ?? r.media_type}`}</p>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        <StatusPill tone="gray">{MATCH[r.match_type]}</StatusPill>
                                        <StatusPill tone="gray">{WHERE[r.trigger_type]}</StatusPill>
                                        {r.media_url && <StatusPill tone="blue">Com anexo</StatusPill>}
                                        {r.hits > 0 && <StatusPill tone="green">{r.hits}× usada</StatusPill>}
                                    </div>
                                </div>
                                <Toggle checked={r.enabled} onChange={v => toggle(r, v)} label={`Ativar resposta ${r.keyword}`} />
                                <button type="button" onClick={() => open(r)} aria-label="Editar" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06]"><Pencil className="w-4 h-4" /></button>
                                <button type="button" onClick={() => setRemoving(r)} aria-label="Apagar" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06] hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {editing && (
                <Sheet open onClose={() => setEditing(null)} title={editing.id ? 'Editar resposta' : 'Nova resposta automática'}>
                    <div className="space-y-4">
                        <FieldRow label="Quando o cliente escrever"><input value={editing.form.keyword} onChange={e => setEditing({ ...editing, form: { ...editing.form, keyword: e.target.value } })} maxLength={200} placeholder="ex.: endereço" className={fieldCls} /></FieldRow>
                        <Segmented value={editing.form.match_type} onChange={v => setEditing({ ...editing, form: { ...editing.form, match_type: v } })} ariaLabel="Tipo de comparação" className="w-full [&>button]:flex-1"
                            options={[{ value: 'contains', label: 'Contém' }, { value: 'exact', label: 'Igual a' }, { value: 'regex', label: 'Avançado' }]} />
                        {editing.form.match_type === 'regex' && <p className="text-[12px] text-muted-foreground">Expressão regular (ex.: <code>pre[cç]o|valor</code>). Acentos e maiúsculas são ignorados nos outros modos.</p>}
                        <FieldRow label="Responder com"><textarea value={editing.form.response} onChange={e => setEditing({ ...editing, form: { ...editing.form, response: e.target.value } })} rows={4} maxLength={4000} placeholder="Texto da resposta" className={fieldCls} /></FieldRow>
                        <AttachmentPicker value={editing.form.attachment} onChange={a => setEditing({ ...editing, form: { ...editing.form, attachment: a } })} />
                        <FieldRow label="Vale em">
                            <Segmented value={editing.form.trigger_type} onChange={v => setEditing({ ...editing, form: { ...editing.form, trigger_type: v } })} ariaLabel="Onde vale" className="w-full [&>button]:flex-1"
                                options={[{ value: 'private', label: 'Conversas' }, { value: 'group', label: 'Grupos' }, { value: 'all', label: 'Ambos' }]} />
                        </FieldRow>
                        <Button busy={busy} disabled={!editing.form.keyword.trim() || (!editing.form.response.trim() && !editing.form.attachment)} onClick={save} className="w-full h-12 text-[17px]">Salvar</Button>
                    </div>
                </Sheet>
            )}
            {removing && <PremiumConfirmDialog isOpen title="Apagar esta resposta?" description={`A palavra “${removing.keyword}” deixa de ter resposta automática.`} confirmLabel="Apagar" variant="danger" onConfirm={remove} onCancel={() => setRemoving(null)} />}
        </div>
    )
}
