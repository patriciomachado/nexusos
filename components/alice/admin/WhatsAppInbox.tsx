'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ChevronLeft, Hand, Loader2, MessageCircle, Sparkles, User, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Conversation {
    id: string
    customer_name: string | null
    phone_label: string | null
    customer_id: string | null
    mode: 'alice' | 'human'
    unread_count: number
    last_message_at: string
    window_open: boolean
    preview: { text: string; role: string } | null
}

type Item =
    | { kind: 'message'; id: string; role: 'user' | 'assistant' | 'staff' | 'event'; text: string; at: string }
    | { kind: 'action'; id: string; title: string; lines: string[]; status: string; at: string }

const POLL_MS = 6000

function timeLabel(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    return d.toDateString() === today.toDateString()
        ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function WhatsAppInbox({ enabled, initialId, onUnread, onSetup }: { enabled: boolean; initialId: string | null; onUnread: (n: number) => void; onSetup: () => void }) {
    const [list, setList] = useState<Conversation[] | null>(null)
    const [selected, setSelected] = useState<string | null>(initialId)
    const [detail, setDetail] = useState<{ conversation: Conversation & { title?: string }; items: Item[] } | null>(null)
    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    const loadList = useCallback(async () => {
        const res = await fetch('/api/alice/conversations?channel=whatsapp', { cache: 'no-store' })
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
         
        loadList()
        const t = setInterval(() => {
            if (document.visibilityState === 'visible') loadList()
        }, POLL_MS)
        return () => clearInterval(t)
    }, [loadList])

    useEffect(() => {
        if (!selected) return
         
        loadDetail(selected, true)
        const t = setInterval(() => {
            if (document.visibilityState === 'visible') loadDetail(selected)
        }, POLL_MS)
        return () => clearInterval(t)
    }, [selected, loadDetail])

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

    const conv = detail?.conversation
    const name = (c: Pick<Conversation, 'customer_name' | 'phone_label'>) => c.customer_name || c.phone_label || 'Cliente'

    return (
        <div className="space-y-3">
            {!enabled && (
                <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-3 flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <p className="text-[14px] flex-1">O atendimento pelo WhatsApp está desligado. As conversas antigas continuam aqui.</p>
                    <button type="button" onClick={onSetup} className="text-[14px] font-semibold text-primary shrink-0">Configurar</button>
                </div>
            )}
            <div className="rounded-2xl bg-card border border-border/60 overflow-hidden grid md:grid-cols-[320px_1fr] h-[calc(100dvh-14rem-env(safe-area-inset-top))] min-h-[420px]">
                {/* List */}
                <div className={cn('border-r border-border/60 overflow-y-auto', selected && 'hidden md:block')}>
                    {list === null ? (
                        <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : list.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/60" />
                            <p className="text-[15px] text-muted-foreground">Nenhuma conversa ainda. Quando um cliente mandar mensagem, ela aparece aqui.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {list.map(c => (
                                <li key={c.id}>
                                    <button type="button" onClick={() => { setSelected(c.id); setDetail(null) }} className={cn('w-full text-left px-4 py-3 flex gap-3 hover:bg-foreground/[0.03]', selected === c.id && 'bg-primary/[0.06]')}>
                                        <span className="w-10 h-10 rounded-full bg-green-500/15 text-green-700 dark:text-green-400 flex items-center justify-center shrink-0 font-semibold">{name(c).charAt(0).toUpperCase()}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span className="text-[15px] font-semibold truncate flex-1">{name(c)}</span>
                                                <span className="text-[12px] text-muted-foreground shrink-0">{timeLabel(c.last_message_at)}</span>
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <span className="text-[13px] text-muted-foreground truncate flex-1">
                                                    {c.preview ? `${c.preview.role === 'assistant' ? 'Alice: ' : c.preview.role === 'staff' ? 'Você: ' : ''}${c.preview.text}` : ''}
                                                </span>
                                                {c.mode === 'human' && <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 shrink-0">Humano</span>}
                                                {c.unread_count > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-[12px] font-semibold flex items-center justify-center shrink-0">{c.unread_count}</span>}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Chat */}
                <div className={cn('flex flex-col min-h-0', !selected && 'hidden md:flex')}>
                    {!selected ? (
                        <div className="flex-1 flex items-center justify-center text-[15px] text-muted-foreground p-6 text-center">Escolha uma conversa</div>
                    ) : !conv ? (
                        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <>
                            <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
                                <button type="button" onClick={() => setSelected(null)} className="md:hidden w-9 h-9 -ml-1 flex items-center justify-center text-primary" aria-label="Voltar"><ChevronLeft className="w-5 h-5" /></button>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[16px] font-semibold truncate">{name(conv)}</p>
                                    <p className="text-[12px] text-muted-foreground truncate">
                                        {conv.phone_label}
                                        {conv.customer_id && <> · <Link href={`/customers/${conv.customer_id}`} className="text-primary">ver cliente</Link></>}
                                    </p>
                                </div>
                                {conv.mode === 'alice' ? (
                                    <button type="button" onClick={() => setMode('human')} className="h-9 px-3 rounded-full bg-orange-500/12 text-orange-700 dark:text-orange-400 text-[14px] font-semibold flex items-center gap-1.5"><Hand className="w-4 h-4" /> Assumir</button>
                                ) : (
                                    <button type="button" onClick={() => setMode('alice')} className="h-9 px-3 rounded-full bg-primary/12 text-primary text-[14px] font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Devolver à Alice</button>
                                )}
                            </div>
                            <p className={cn('px-4 py-1.5 text-[12px] border-b border-border/60', conv.mode === 'human' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'bg-primary/[0.06] text-primary')}>
                                {conv.mode === 'human' ? 'Você está atendendo. A Alice não responde nesta conversa.' : 'A Alice está respondendo. Escrever aqui assume a conversa.'}
                            </p>
                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-foreground/[0.015]">
                                {detail.items.map(it => it.kind === 'action' ? null : <Bubble key={it.id} item={it} />)}
                            </div>
                            <div className="border-t border-border/60 p-2">
                                {conv.window_open ? (
                                    <form onSubmit={e => { e.preventDefault(); send() }} className="flex items-end gap-2">
                                        <textarea value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
                                            rows={1} placeholder="Responder como a loja…" aria-label="Resposta" className="flex-1 max-h-32 resize-none rounded-[20px] bg-foreground/[0.05] px-4 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-primary/40 field-sizing-content" />
                                        <button type="submit" disabled={!reply.trim() || sending} aria-label="Enviar" className="w-10 h-10 mb-0.5 rounded-full bg-green-500 text-white flex items-center justify-center disabled:opacity-40">
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                                        </button>
                                    </form>
                                ) : (
                                    <p className="text-[13px] text-muted-foreground px-2 py-2 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Passaram mais de 24h da última mensagem do cliente. Pelas regras do WhatsApp, só dá para responder quando ele escrever de novo.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
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
