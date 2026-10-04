'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ChevronLeft, Hand, Instagram, Loader2, MessageCircle, Sparkles, Tag, User, Clock, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ActionMenu from '@/components/ui/ActionMenu'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import Sheet from '@/components/tasks/Sheet'

interface Conversation {
    id: string
    channel: 'whatsapp' | 'instagram'
    customer_name: string | null
    contact_label: string | null
    customer_id: string | null
    mode: 'alice' | 'human'
    unread_count: number
    last_message_at: string
    window_open: boolean
    preview: { text: string; role: string } | null
    labels?: LabelRef[]
}
interface LabelRef { id: string; name: string; color: string }

/** Small per-channel accent so WhatsApp and Instagram conversations stay visually distinct in the merged inbox. */
function channelStyle(channel: Conversation['channel']) {
    return channel === 'instagram'
        ? { avatarBg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white', badgeBg: 'bg-pink-500', sendBg: 'bg-pink-500', icon: Instagram }
        : { avatarBg: 'bg-green-500/15 text-green-700 dark:text-green-400', badgeBg: 'bg-green-500', sendBg: 'bg-green-500', icon: MessageCircle }
}

type Item =
    | { kind: 'message'; id: string; role: 'user' | 'assistant' | 'staff' | 'event'; text: string; at: string }
    | { kind: 'action'; id: string; title: string; lines: string[]; status: string; at: string }

/** Sidebar list: who's talking, unread counts. Doesn't need to be instant. */
const LIST_POLL_MS = 3000
/** Open conversation: fast enough to feel live. */
const DETAIL_POLL_MS = 1500

function timeLabel(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    return d.toDateString() === today.toDateString()
        ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function WhatsAppInbox({ enabled, initialId, onUnread, onSetup, isAdmin = true }: { enabled: boolean; initialId: string | null; onUnread: (n: number) => void; onSetup?: () => void; isAdmin?: boolean }) {
    const [list, setList] = useState<Conversation[] | null>(null)
    const [selected, setSelected] = useState<string | null>(initialId)
    const [detail, setDetail] = useState<{ conversation: Conversation & { title?: string }; items: Item[] } | null>(null)
    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
    const [renaming, setRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState('')
    const [labels, setLabels] = useState<LabelRef[]>([])
    const [labelFilter, setLabelFilter] = useState('')
    const [labelPicker, setLabelPicker] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    const loadList = useCallback(async () => {
        const res = await fetch('/api/alice/conversations?channel=social', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const convs: Conversation[] = data.conversations ?? []
        setList(convs)
        onUnread(convs.reduce((s, c) => s + (c.unread_count || 0), 0))
    }, [onUnread])

    const loadDetail = useCallback(async (id: string, scroll = false) => {
        const res = await fetch(`/api/alice/conversations/${id}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setDetail(prev => {
            const grew = !prev || prev.items.length !== data.items.length
            if (grew || scroll) requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
            return data
        })
    }, [])

    useEffect(() => {
        fetch('/api/alice/labels', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => d && setLabels(d.labels ?? [])).catch(() => {})
    }, [])

    const toggleLabel = async (label: LabelRef) => {
        if (!selected) return
        const current = list?.find(c => c.id === selected)?.labels ?? []
        const next = current.some(l => l.id === label.id) ? current.filter(l => l.id !== label.id) : [...current, label]
        setList(l => l?.map(c => c.id === selected ? { ...c, labels: next } : c) ?? null)
        const res = await fetch(`/api/alice/conversations/${selected}/labels`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label_ids: next.map(l => l.id) }) })
        if (!res.ok) { toast.error('Não foi possível mudar a etiqueta.'); loadList() }
    }

    useEffect(() => {

        loadList()
        const onVisible = () => { if (document.visibilityState === 'visible') loadList() }
        const t = setInterval(onVisible, LIST_POLL_MS)
        document.addEventListener('visibilitychange', onVisible)
        return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
    }, [loadList])

    useEffect(() => {
        if (!selected) return

        loadDetail(selected, true)
        const onVisible = () => { if (document.visibilityState === 'visible') loadDetail(selected) }
        const t = setInterval(onVisible, DETAIL_POLL_MS)
        document.addEventListener('visibilitychange', onVisible)
        return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
    }, [selected, loadDetail])

    // Deep-linked here again (e.g. another WhatsApp button, already on this tab): jump to that conversation.
    useEffect(() => {
        if (initialId) setSelected(initialId)
    }, [initialId])

    const setMode = async (mode: 'alice' | 'human') => {
        if (!selected) return
        const res = await fetch(`/api/alice/conversations/${selected}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) })
        if (!res.ok) return toast.error('Não foi possível mudar.')
        toast.success(mode === 'human' ? 'Você assumiu a conversa. A Alice não responde mais aqui.' : 'A Alice voltou a responder esta conversa.')
        loadDetail(selected)
        loadList()
    }

    const send = async () => {
        if (!selected || !reply.trim() || sending) return
        setSending(true)
        try {
            const res = await fetch(`/api/alice/conversations/${selected}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: reply.trim() }) })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error ?? 'Não foi possível enviar.')
            setReply('')
            await loadDetail(selected, true)
            loadList()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setSending(false)
        }
    }

    const deleteConversation = async (id: string) => {
        const res = await fetch(`/api/alice/conversations/${id}`, { method: 'DELETE' })
        if (!res.ok) return toast.error('Não foi possível apagar.')
        setList(l => l?.filter(c => c.id !== id) ?? null)
        if (id === selected) { setSelected(null); setDetail(null) }
        toast.success('Conversa apagada')
    }

    const confirmDelete = async () => {
        const id = pendingDeleteId
        setPendingDeleteId(null)
        if (id) await deleteConversation(id)
    }

    const openRename = () => {
        if (!conv) return
        setRenameValue(conv.customer_name ?? '')
        setRenaming(true)
    }

    const saveRename = async () => {
        if (!selected) return
        const title = renameValue.trim()
        if (!title) return
        try {
            const res = await fetch(`/api/alice/conversations/${selected}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
            if (!res.ok) throw new Error()
            setDetail(d => d ? { ...d, conversation: { ...d.conversation, customer_name: title } } : d)
            setList(l => l?.map(c => c.id === selected ? { ...c, customer_name: title } : c) ?? null)
            setRenaming(false)
            toast.success('Conversa renomeada')
        } catch {
            toast.error('Não foi possível renomear')
        }
    }

    const conv = detail?.conversation
    const name = (c: Pick<Conversation, 'customer_name' | 'contact_label'>) => c.customer_name || c.contact_label || 'Cliente'

    return (
        <div className="space-y-3">
            {!enabled && (
                <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-3 flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <p className="text-[14px] flex-1">O atendimento pelo WhatsApp e Instagram está desligado. As conversas antigas continuam aqui.</p>
                    {onSetup && <button type="button" onClick={onSetup} className="text-[14px] font-semibold text-primary shrink-0">Configurar</button>}
                </div>
            )}
            <div className="rounded-2xl bg-card border border-border/60 overflow-hidden grid md:grid-cols-[320px_1fr] h-[calc(100dvh-14rem-env(safe-area-inset-top))] min-h-[420px]">
                {/* List */}
                <div className={cn('border-r border-border/60 overflow-y-auto min-w-0', selected && 'hidden md:block')}>
                    {labels.length > 0 && (
                        <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                            <select value={labelFilter} onChange={e => setLabelFilter(e.target.value)} aria-label="Filtrar por etiqueta" className="flex-1 h-8 rounded-lg bg-foreground/[0.05] px-2 text-[14px] focus:outline-none">
                                <option value="">Todas as conversas</option>
                                {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                    )}
                    {list === null ? (
                        <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : list.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/60" />
                            <p className="text-[15px] text-muted-foreground">Nenhuma conversa ainda. Quando um cliente mandar mensagem, ela aparece aqui.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {list.filter(c => !labelFilter || c.labels?.some(l => l.id === labelFilter)).map(c => {
                                const style = channelStyle(c.channel)
                                const ChannelIcon = style.icon
                                return (
                                <li key={c.id} className="flex items-center">
                                    <button type="button" onClick={() => { setSelected(c.id); setDetail(null) }} className={cn('flex-1 min-w-0 text-left px-4 py-3 flex gap-3 hover:bg-foreground/[0.03]', selected === c.id && 'bg-primary/[0.06]')}>
                                        <span className="relative shrink-0">
                                            <span className={cn('w-10 h-10 rounded-full flex items-center justify-center font-semibold', style.avatarBg)}>{name(c).charAt(0).toUpperCase()}</span>
                                            <span className={cn('absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white ring-2 ring-card', style.badgeBg)}><ChannelIcon className="w-2.5 h-2.5" /></span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span className="text-[15px] font-semibold truncate flex-1">{name(c)}</span>
                                                <span className="text-[12px] text-muted-foreground shrink-0">{timeLabel(c.last_message_at)}</span>
                                            </span>
                                            {!!c.labels?.length && (
                                                <span className="flex flex-wrap gap-1 py-0.5">
                                                    {c.labels.map(l => <span key={l.id} className="inline-flex items-center h-[18px] px-1.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: l.color }}>{l.name}</span>)}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-2">
                                                <span className="text-[13px] text-muted-foreground truncate flex-1">
                                                    {c.preview ? `${c.preview.role === 'assistant' ? 'Alice: ' : c.preview.role === 'staff' ? 'Você: ' : ''}${c.preview.text}` : ''}
                                                </span>
                                                {c.mode === 'human' && <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 shrink-0">Humano</span>}
                                                {c.unread_count > 0 && <span className={cn('min-w-[20px] h-5 px-1.5 rounded-full text-white text-[12px] font-semibold flex items-center justify-center shrink-0', style.badgeBg)}>{c.unread_count}</span>}
                                            </span>
                                        </span>
                                    </button>
                                    {isAdmin && <button type="button" onClick={() => setPendingDeleteId(c.id)} aria-label={`Apagar conversa com ${name(c)}`} className="w-9 h-9 mr-2 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06] hover:text-red-600 dark:hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
                                </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                {/* Chat */}
                <div className={cn('flex flex-col min-h-0 min-w-0', !selected && 'hidden md:flex')}>
                    {!selected ? (
                        <div className="flex-1 flex items-center justify-center text-[15px] text-muted-foreground p-6 text-center">Escolha uma conversa</div>
                    ) : !conv ? (
                        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <>
                            <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
                                <button type="button" onClick={() => setSelected(null)} className="md:hidden w-9 h-9 -ml-1 flex items-center justify-center text-primary" aria-label="Voltar"><ChevronLeft className="w-5 h-5" /></button>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[16px] font-semibold truncate flex items-center gap-1.5">
                                        {(() => { const ChannelIcon = channelStyle(conv.channel).icon; return <ChannelIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> })()}
                                        {name(conv)}
                                    </p>
                                    <p className="text-[12px] text-muted-foreground truncate">
                                        {conv.contact_label}
                                        {conv.customer_id && <> · <Link href={`/customers/${conv.customer_id}`} className="text-primary">ver cliente</Link></>}
                                    </p>
                                </div>
                                {conv.mode === 'alice' ? (
                                    <button type="button" onClick={() => setMode('human')} className="h-9 px-3 rounded-full bg-orange-500/12 text-orange-700 dark:text-orange-400 text-[14px] font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap"><Hand className="w-4 h-4" /> Assumir</button>
                                ) : (
                                    <button type="button" onClick={() => setMode('alice')} className="h-9 px-3 rounded-full bg-primary/12 text-primary text-[14px] font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap"><Sparkles className="w-4 h-4" /> Devolver à Alice</button>
                                )}
                                <div className="shrink-0">
                                    <ActionMenu
                                        label="Mais opções"
                                        items={[
                                            { label: 'Renomear conversa', icon: <Pencil className="w-4 h-4" />, onSelect: openRename },
                                            ...(labels.length ? [{ label: 'Etiquetas', icon: <Tag className="w-4 h-4" />, onSelect: () => setLabelPicker(true) }] : []),
                                            ...(isAdmin ? [{ label: 'Apagar conversa', icon: <Trash2 className="w-4 h-4" />, danger: true, onSelect: () => setPendingDeleteId(selected) }] : []),
                                        ]}
                                    />
                                </div>
                            </div>
                            <p className={cn('px-4 py-1.5 text-[12px] border-b border-border/60', conv.mode === 'human' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'bg-primary/[0.06] text-primary')}>
                                {conv.mode === 'human' ? 'Você está atendendo. A Alice não responde nesta conversa.' : 'A Alice está respondendo. Escrever aqui assume a conversa.'}
                            </p>
                            <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto px-4 py-4 space-y-2 bg-foreground/[0.015]">
                                {detail.items.map(it => it.kind === 'action' ? null : <Bubble key={it.id} item={it} />)}
                            </div>
                            <div className="border-t border-border/60 p-2 space-y-1.5">
                                {!conv.window_open && (
                                    <p className="text-[12px] text-muted-foreground px-2 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 shrink-0" /> {detail.items.length ? 'Mais de 24h desde a última mensagem do cliente.' : `Este cliente ainda não escreveu pelo ${conv.channel === 'instagram' ? 'Instagram' : 'WhatsApp'}.`}{' '}
                                        {conv.channel === 'instagram' ? 'O Instagram só permite responder dentro dessa janela — pode tentar mesmo assim.' : 'Pelas regras do WhatsApp, o envio pode ser recusado sem uma mensagem de modelo aprovada — pode tentar mesmo assim.'}
                                    </p>
                                )}
                                <form onSubmit={e => { e.preventDefault(); send() }} className="flex items-end gap-2">
                                    <textarea value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
                                        rows={1} placeholder="Responder como a loja…" aria-label="Resposta" className="flex-1 max-h-32 resize-none rounded-[20px] bg-foreground/[0.05] px-4 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-primary/40 field-sizing-content" />
                                    <button type="submit" disabled={!reply.trim() || sending} aria-label="Enviar" className={cn('w-10 h-10 mb-0.5 rounded-full text-white flex items-center justify-center disabled:opacity-40', channelStyle(conv.channel).sendBg)}>
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {pendingDeleteId && (
                <PremiumConfirmDialog
                    isOpen
                    title="Apagar esta conversa?"
                    description="Todo o histórico de mensagens com esse cliente some para sempre. Isso não desfaz nenhum orçamento, OS ou cadastro já criado a partir dela."
                    confirmLabel="Apagar"
                    variant="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setPendingDeleteId(null)}
                />
            )}

            {labelPicker && selected && (
                <Sheet open onClose={() => setLabelPicker(false)} title="Etiquetas da conversa">
                    <ul className="space-y-1">
                        {labels.map(l => {
                            const on = !!list?.find(c => c.id === selected)?.labels?.some(x => x.id === l.id)
                            return (
                                <li key={l.id}>
                                    <button type="button" onClick={() => toggleLabel(l)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-foreground/[0.05] text-left">
                                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                                        <span className="flex-1 text-[16px]">{l.name}</span>
                                        <span className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center text-white text-[13px]', on ? 'bg-primary border-primary' : 'border-border')}>{on && '✓'}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </Sheet>
            )}

            {renaming && (
                <Sheet open onClose={() => setRenaming(false)} title="Renomear conversa">
                    <div className="space-y-4">
                        <input
                            data-autofocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveRename() } }}
                            maxLength={120}
                            placeholder="Nome do cliente"
                            aria-label="Nome do cliente"
                            className="w-full h-12 px-4 rounded-2xl bg-foreground/[0.05] text-[17px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button type="button" disabled={!renameValue.trim()} onClick={saveRename} className="w-full h-12 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold disabled:opacity-50">Salvar</button>
                    </div>
                </Sheet>
            )}
        </div>
    )
}

function Bubble({ item }: { item: Extract<Item, { kind: 'message' }> }) {
    if (item.role === 'event') return <p className="text-center text-[12px] text-muted-foreground py-1">{item.text}</p>
    const mine = item.role !== 'user'
    return (
        <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words',
                item.role === 'user' ? 'bg-card border border-border/60 rounded-bl-md'
                    : item.role === 'assistant' ? 'bg-violet-500/12 text-foreground rounded-br-md'
                        : 'bg-green-500/15 text-foreground rounded-br-md')}>
                {mine && (
                    <p className={cn('text-[11px] font-semibold mb-0.5 flex items-center gap-1', item.role === 'assistant' ? 'text-violet-600 dark:text-violet-400' : 'text-green-700 dark:text-green-400')}>
                        {item.role === 'assistant' ? <><Sparkles className="w-3 h-3" /> Alice</> : <><User className="w-3 h-3" /> Loja</>}
                    </p>
                )}
                {item.text}
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">{timeLabel(item.at)}</p>
            </div>
        </div>
    )
}
