'use client'

import { useEffect, useState } from 'react'
import { Ban, RefreshCw, Search, Send, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import Sheet from '@/components/tasks/Sheet'
import { api, AttachmentPicker, Attachment, attachmentFields, Button, dateTime, Empty, fieldCls, Notice, Panel, Spinner, StatusPill, useLoad } from './ui'

interface Contact { id: string; phone: string; name: string | null; push_name: string | null; customer_id: string | null; customer_name: string | null; blocked: boolean; last_seen_at: string | null }

/** Quem já falou com a loja + agenda do WhatsApp, ligados ao cadastro de clientes pelo telefone. */
export default function ContactsView() {
    const [q, setQ] = useState('')
    const [term, setTerm] = useState('')
    const { data, error, reload } = useLoad<{ total: number; contacts: Contact[] }>(`/api/alice/contacts?q=${encodeURIComponent(term)}`)
    const [syncing, setSyncing] = useState(false)
    const [target, setTarget] = useState<Contact | null>(null)

    useEffect(() => {
        const t = setTimeout(() => setTerm(q.trim()), 300)
        return () => clearTimeout(t)
    }, [q])

    const sync = async () => {
        setSyncing(true)
        try {
            const r = await api<{ synced: number }>('/api/alice/contacts', { method: 'POST' })
            toast.success(`${r.synced} contatos atualizados`)
            reload()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setSyncing(false)
        }
    }

    const block = async (c: Contact) => {
        try { await api(`/api/alice/contacts/${c.id}`, { method: 'PATCH', body: { blocked: !c.blocked } }); toast.success(c.blocked ? 'Contato liberado' : 'Contato bloqueado: não recebe respostas automáticas nem disparos'); reload() } catch (err) { toast.error((err as Error).message) }
    }

    return (
        <div className="space-y-4">
            <Notice>Contatos bloqueados continuam podendo escrever (você vê a mensagem), mas a Alice e as respostas automáticas não respondem e eles ficam fora dos disparos.</Notice>
            <Panel title="Contatos" description={data ? `${data.total} contatos` : undefined} action={<Button variant="soft" busy={syncing} onClick={sync}><RefreshCw className="w-4 h-4" /> Atualizar</Button>}>
                <div className="px-5 pb-3"><div className="relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome ou número" className={`${fieldCls} pl-10`} /></div></div>
                {error ? <p className="px-5 pb-5 text-[14px] text-red-600">{error}</p> : !data ? <Spinner /> : data.contacts.length === 0 ? (
                    <Empty icon={<Users className="w-5 h-5" />}>{term ? 'Nenhum contato encontrado.' : 'Sem contatos ainda. Eles aparecem quando alguém escreve, ou toque em Atualizar para trazer a agenda do WhatsApp.'}</Empty>
                ) : (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                        {data.contacts.map(c => (
                            <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-green-500/15 text-green-700 dark:text-green-400 font-semibold flex items-center justify-center shrink-0">{(c.name || c.push_name || c.phone).charAt(0).toUpperCase()}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-semibold truncate">{c.customer_name || c.name || c.push_name || c.phone}</p>
                                    <p className="text-[12px] text-muted-foreground truncate">{c.phone}{c.last_seen_at && ` · última mensagem ${dateTime(c.last_seen_at)}`}</p>
                                    <div className="flex gap-1.5 pt-0.5">
                                        {c.customer_id && <Link href={`/customers/${c.customer_id}`}><StatusPill tone="blue">Cliente</StatusPill></Link>}
                                        {c.blocked && <StatusPill tone="red">Bloqueado</StatusPill>}
                                    </div>
                                </div>
                                <button type="button" onClick={() => setTarget(c)} aria-label="Enviar mensagem" className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10"><Send className="w-4 h-4" /></button>
                                <button type="button" onClick={() => block(c)} aria-label={c.blocked ? 'Liberar' : 'Bloquear'} className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-foreground/[0.06] ${c.blocked ? 'text-red-600' : 'text-muted-foreground'}`}><Ban className="w-4 h-4" /></button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            {target && <SendSheet to={target.phone} label={target.customer_name || target.name || target.push_name || target.phone} onClose={() => setTarget(null)} />}
        </div>
    )
}

/** Quick manual message (used by Contatos and Grupos). */
export function SendSheet({ to, label, onClose }: { to: string; label: string; onClose: () => void }) {
    const [text, setText] = useState('')
    const [attachment, setAttachment] = useState<Attachment | null>(null)
    const [busy, setBusy] = useState(false)
    const send = async () => {
        setBusy(true)
        try { await api('/api/alice/send', { method: 'POST', body: { to, text: text.trim() || null, ...attachmentFields(attachment) } }); toast.success('Mensagem enviada'); onClose() } catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
    }
    return (
        <Sheet open onClose={onClose} title={`Mensagem para ${label}`}>
            <div className="space-y-4">
                <textarea value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={4000} placeholder="Escreva a mensagem" className={fieldCls} />
                <AttachmentPicker value={attachment} onChange={setAttachment} />
                <Button busy={busy} disabled={!text.trim() && !attachment} onClick={send} className="w-full h-12 text-[17px]">Enviar</Button>
            </div>
        </Sheet>
    )
}
