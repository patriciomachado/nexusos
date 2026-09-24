'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
    Sparkles, X, Mic, Square, ArrowUp, Loader2, History, SquarePen, Volume2, VolumeX,
    Check, CircleX, Clock, ChevronLeft, Trash2, ExternalLink, Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAliceStore } from '@/store/aliceStore'
import { useVoice, speak, stopSpeaking } from './useVoice'
import { RichText } from './RichText'

type ActionStatus = 'proposed' | 'executed' | 'rejected' | 'failed' | 'expired' | 'working'

type Item =
    | { kind: 'message'; id: string; role: 'user' | 'assistant' | 'event' | 'staff'; text: string; streaming?: boolean }
    | { kind: 'action'; id: string; title: string; lines: string[]; status: ActionStatus; message?: string; href?: string }
    | { kind: 'error'; id: string; text: string }

interface ConversationSummary { id: string; title: string | null; last_message_at: string; preview: { text: string } | null }

const STAFF_SUGGESTIONS = [
    'Quais OS estão aguardando peças?',
    'O que tenho na agenda hoje?',
    'Busque o cliente João e mostre as OS dele',
    'Quais peças estão com estoque baixo?',
]
const ADMIN_SUGGESTIONS = [
    'Como foi o faturamento hoje?',
    'Quais são as pendências da loja?',
    'Abra uma OS para a Maria: troca de tela do iPhone 12, R$ 450',
    'Me lembre de pagar o fornecedor amanhã às 10h',
]

let seq = 0
const uid = () => `local-${Date.now()}-${seq++}`

function readSpeakPref() {
    try { return localStorage.getItem('alice:speak') === '1' } catch { return false }
}

export default function AlicePanel() {
    const { open, pending, status, setOpen, fetchStatus } = useAliceStore()
    const [mounted, setMounted] = useState(false)
    const [view, setView] = useState<'chat' | 'history'>('chat')
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [items, setItems] = useState<Item[]>([])
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const [toolLabel, setToolLabel] = useState<string | null>(null)
    const [history, setHistory] = useState<ConversationSummary[] | null>(null)
    const [speakReplies, setSpeakReplies] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
         
        setMounted(true)
        setSpeakReplies(readSpeakPref())
    }, [])

    // ⌘J / Ctrl+J anywhere.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
                e.preventDefault()
                if (!useAliceStore.getState().status) fetchStatus()
                setOpen(!useAliceStore.getState().open)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [setOpen, fetchStatus])

    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = prev
            document.removeEventListener('keydown', onKey)
            stopSpeaking()
        }
    }, [open, setOpen])

    const scrollToEnd = useCallback(() => {
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }))
    }, [])

    const send = useCallback(async (raw: string, voice = false) => {
        const text = raw.trim()
        if (!text || busy) return
        stopSpeaking()
        setInput('')
        setBusy(true)
        setToolLabel(null)
        let current = uid()
        setItems(list => [...list, { kind: 'message', id: uid(), role: 'user', text }, { kind: 'message', id: current, role: 'assistant', text: '', streaming: true }])
        scrollToEnd()

        let spoken = ''
        const controller = new AbortController()
        abortRef.current = controller
        try {
            const res = await fetch('/api/alice/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: conversationId ?? undefined, message: text, voice }),
                signal: controller.signal,
            })
            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'A Alice não respondeu. Tente de novo.')
            }
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            for (;;) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                let nl: number
                while ((nl = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, nl).trim()
                    buffer = buffer.slice(nl + 1)
                    if (!line) continue
                    const e = JSON.parse(line)
                    if (e.t === 'conversation') setConversationId(e.id)
                    else if (e.t === 'text') {
                        setToolLabel(null)
                        spoken += e.d
                        const id = current
                        setItems(list => list.map(it => it.id === id && it.kind === 'message' ? { ...it, text: it.text + e.d } : it))
                        scrollToEnd()
                    } else if (e.t === 'tool') setToolLabel(e.label)
                    else if (e.t === 'action') {
                        const next = uid()
                        const prev = current
                        current = next
                        setItems(list => [
                            ...list.map(it => it.id === prev && it.kind === 'message' ? { ...it, streaming: false } : it),
                            { kind: 'action', id: e.action.id, title: e.action.title, lines: e.action.lines, status: 'proposed' },
                            { kind: 'message', id: next, role: 'assistant', text: '', streaming: true },
                        ])
                        scrollToEnd()
                    } else if (e.t === 'error') {
                        setItems(list => [...list, { kind: 'error', id: uid(), text: e.message }])
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') setItems(list => [...list, { kind: 'error', id: uid(), text: (err as Error).message }])
        } finally {
            abortRef.current = null
            setBusy(false)
            setToolLabel(null)
            // Drop empty bubbles (turns that only called tools).
            setItems(list => list.filter(it => !(it.kind === 'message' && it.role === 'assistant' && !it.text.trim())).map(it => it.kind === 'message' ? { ...it, streaming: false } : it))
            if ((voice || readSpeakPref()) && spoken.trim()) speak(spoken)
            scrollToEnd()
        }
    }, [busy, conversationId, scrollToEnd])

    const voice = useVoice({
        serverTranscription: !!status?.transcription,
        onText: text => send(text, true),
        onError: message => toast.error(message),
    })

    // Opened with a question already (e.g. from a shortcut elsewhere).
    useEffect(() => {
        if (open && pending) {
            useAliceStore.setState({ pending: null })
            send(pending)
        }
    }, [open, pending, send])

    useEffect(() => {
        if (open && view === 'chat' && !busy) setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60)
    }, [open, view, busy])

    const decide = async (id: string, decision: 'confirm' | 'reject') => {
        setItems(list => list.map(it => it.kind === 'action' && it.id === id ? { ...it, status: 'working' } : it))
        try {
            const res = await fetch(`/api/alice/actions/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) })
            const data = await res.json().catch(() => ({}))
            const statusNext: ActionStatus = data.status ?? (res.ok ? 'executed' : 'failed')
            setItems(list => list.map(it => it.kind === 'action' && it.id === id ? { ...it, status: statusNext, message: data.message ?? data.error, href: data.href } : it))
            if (statusNext === 'executed') {
                toast.success(data.message ?? 'Feito.')
                if (readSpeakPref()) speak(data.message ?? 'Feito.')
            } else if (statusNext === 'failed' || statusNext === 'expired') toast.error(data.message ?? data.error ?? 'Não foi possível.')
        } catch {
            setItems(list => list.map(it => it.kind === 'action' && it.id === id ? { ...it, status: 'proposed' } : it))
            toast.error('Sem conexão. Tente de novo.')
        }
    }

    const newChat = () => {
        abortRef.current?.abort()
        stopSpeaking()
        setConversationId(null)
        setItems([])
        setView('chat')
    }

    const openHistory = async () => {
        setView('history')
        setHistory(null)
        const res = await fetch('/api/alice/conversations?channel=app', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        setHistory(data.conversations ?? [])
    }

    const loadConversation = async (id: string) => {
        setView('chat')
        setItems([])
        setConversationId(id)
        const res = await fetch(`/api/alice/conversations/${id}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        setItems((data.items ?? []).map((it: Item & { role?: string }) => it))
        scrollToEnd()
    }

    const deleteConversation = async (id: string) => {
        await fetch(`/api/alice/conversations/${id}`, { method: 'DELETE' })
        setHistory(h => h?.filter(c => c.id !== id) ?? null)
        if (id === conversationId) newChat()
    }

    const toggleSpeak = () => {
        const next = !speakReplies
        setSpeakReplies(next)
        try { localStorage.setItem('alice:speak', next ? '1' : '0') } catch { /* private mode */ }
        if (!next) stopSpeaking()
    }

    if (!mounted || !open) return null

    const suggestions = status?.isAdmin ? ADMIN_SUGGESTIONS : STAFF_SUGGESTIONS
    const recording = voice.state === 'recording'
    const transcribing = voice.state === 'transcribing'

    return createPortal(
        <div
            className="fixed inset-0 z-[1000] flex justify-end bg-black/30 animate-in fade-in duration-150"
            onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label="Alice"
                className="relative w-full sm:w-[440px] h-full bg-background sm:border-l border-border/70 shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-200"
                style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
                {/* Toolbar */}
                <header className="h-14 px-2 flex items-center gap-1 border-b border-border/60 material-bar shrink-0">
                    {view === 'history' ? (
                        <button type="button" onClick={() => setView('chat')} className="h-11 px-2 flex items-center gap-1 text-primary text-[17px]">
                            <ChevronLeft className="w-5 h-5" /> Voltar
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 pl-2 min-w-0">
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></span>
                            <div className="min-w-0">
                                <p className="text-[17px] font-semibold leading-tight">Alice</p>
                                <p className="text-[12px] text-muted-foreground leading-tight truncate">{busy ? (toolLabel ? `${toolLabel}…` : 'Pensando…') : 'Assistente do NexusOS'}</p>
                            </div>
                        </div>
                    )}
                    <div className="ml-auto flex items-center">
                        {view === 'chat' && (
                            <>
                                <IconButton label={speakReplies ? 'Não ler respostas em voz alta' : 'Ler respostas em voz alta'} onClick={toggleSpeak}>
                                    {speakReplies ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                                </IconButton>
                                <IconButton label="Conversas anteriores" onClick={openHistory}><History className="w-5 h-5" /></IconButton>
                                <IconButton label="Nova conversa" onClick={newChat}><SquarePen className="w-5 h-5" /></IconButton>
                            </>
                        )}
                        <IconButton label="Fechar" onClick={() => setOpen(false)}><X className="w-5 h-5" /></IconButton>
                    </div>
                </header>

                {view === 'history' ? (
                    <div className="flex-1 overflow-y-auto">
                        {history === null ? (
                            <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                        ) : history.length === 0 ? (
                            <p className="p-6 text-center text-[15px] text-muted-foreground">Nenhuma conversa ainda.</p>
                        ) : (
                            <ul className="divide-y divide-border/60">
                                {history.map(c => (
                                    <li key={c.id} className="flex items-center">
                                        <button type="button" onClick={() => loadConversation(c.id)} className="flex-1 min-w-0 text-left px-4 py-3 hover:bg-foreground/[0.03]">
                                            <p className="text-[15px] font-medium truncate">{c.title || 'Conversa'}</p>
                                            <p className="text-[13px] text-muted-foreground truncate">
                                                {new Date(c.last_message_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {c.preview?.text ?? ''}
                                            </p>
                                        </button>
                                        <IconButton label="Apagar conversa" onClick={() => deleteConversation(c.id)}><Trash2 className="w-4 h-4 text-muted-foreground" /></IconButton>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <>
                        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
                            {status && !status.configured ? (
                                <SetupNotice isAdmin={status.isAdmin} reason={status.setupNeeded} />
                            ) : items.length === 0 ? (
                                <div className="pt-6 space-y-5">
                                    <div className="text-center space-y-2">
                                        <span className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center"><Sparkles className="w-7 h-7" /></span>
                                        <h2 className="type-title3">Como posso ajudar?</h2>
                                        <p className="text-[15px] text-muted-foreground max-w-xs mx-auto">
                                            Pergunte ou peça por texto ou voz. Consultas eu respondo na hora; mudanças só acontecem quando você confirmar.
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        {suggestions.map(s => (
                                            <button key={s} type="button" onClick={() => send(s)} className="text-left px-4 py-3 rounded-2xl bg-card border border-border/60 text-[15px] hover:bg-foreground/[0.03] active:scale-[0.99] transition">
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                items.map(it => <TimelineItem key={it.id} item={it} onDecide={decide} onNavigate={() => setOpen(false)} />)
                            )}
                            {busy && toolLabel && (
                                <p className="flex items-center gap-2 text-[13px] text-muted-foreground pl-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {toolLabel}…</p>
                            )}
                        </div>

                        {/* Composer */}
                        <div className="shrink-0 border-t border-border/60 bg-background px-3 pt-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                            {recording || transcribing ? (
                                <div className="flex items-center gap-3 h-14 px-2">
                                    <span className="relative w-10 h-10 flex items-center justify-center">
                                        <span className="absolute inset-0 rounded-full bg-red-500/20 transition-transform" style={{ transform: `scale(${1 + voice.level * 0.6})` }} />
                                        <Mic className="relative w-5 h-5 text-red-500" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-medium">{transcribing ? 'Entendendo…' : 'Ouvindo… toque para enviar'}</p>
                                        <p className="text-[13px] text-muted-foreground truncate">{voice.interim || `0:${String(voice.elapsed).padStart(2, '0')} de 1:00`}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={voice.stop}
                                        disabled={transcribing}
                                        className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center active:scale-95 transition disabled:opacity-50"
                                        aria-label="Parar e enviar"
                                    >
                                        {transcribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
                                    </button>
                                </div>
                            ) : (
                                <form
                                    onSubmit={e => { e.preventDefault(); send(input) }}
                                    className="flex items-end gap-2"
                                >
                                    <div className="flex-1 min-w-0 rounded-[22px] bg-foreground/[0.05] focus-within:ring-2 focus-within:ring-primary/40 px-4 py-2.5">
                                        <textarea
                                            ref={inputRef}
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) }
                                            }}
                                            rows={1}
                                            placeholder="Pergunte ou peça algo…"
                                            aria-label="Mensagem para a Alice"
                                            enterKeyHint="send"
                                            disabled={busy || (status ? !status.configured : false)}
                                            className="block w-full max-h-32 resize-none bg-transparent text-[17px] leading-6 placeholder:text-muted-foreground focus:outline-none field-sizing-content"
                                        />
                                    </div>
                                    {input.trim() || !voice.supported ? (
                                        <button type="submit" disabled={!input.trim() || busy} aria-label="Enviar" className="w-11 h-11 mb-0.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition">
                                            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                                        </button>
                                    ) : (
                                        <button type="button" onClick={voice.start} disabled={busy || (status ? !status.configured : false)} aria-label="Falar com a Alice" className="w-11 h-11 mb-0.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition">
                                            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                        </button>
                                    )}
                                </form>
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>,
        document.body
    )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} aria-label={label} title={label} className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-foreground/[0.05] active:bg-foreground/[0.08] transition-colors">
            {children}
        </button>
    )
}

function SetupNotice({ isAdmin, reason }: { isAdmin: boolean; reason: string | null }) {
    return (
        <div className="mt-6 rounded-2xl bg-card border border-border/60 p-5 space-y-2 text-center">
            <Settings2 className="w-8 h-8 mx-auto text-orange-500" />
            <p className="type-headline">A Alice ainda não está pronta</p>
            <p className="text-[15px] text-muted-foreground">
                {reason === 'migration'
                    ? 'Falta ativar a Alice no banco de dados.'
                    : 'Falta configurar a chave da IA (ANTHROPIC_API_KEY) na Vercel.'}
                {isAdmin ? ' Veja o passo a passo na página da Alice.' : ' Avise o administrador.'}
            </p>
            {isAdmin && <Link href="/alice" onClick={() => useAliceStore.getState().setOpen(false)} className="inline-flex h-10 px-4 items-center rounded-full bg-primary text-primary-foreground text-[15px] font-semibold">Abrir configuração</Link>}
        </div>
    )
}

function TimelineItem({ item, onDecide, onNavigate }: { item: Item; onDecide: (id: string, d: 'confirm' | 'reject') => void; onNavigate: () => void }) {
    if (item.kind === 'error') {
        return <p role="alert" className="text-[14px] text-red-600 dark:text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{item.text}</p>
    }
    if (item.kind === 'action') return <ActionCard action={item} onDecide={onDecide} onNavigate={onNavigate} />
    if (item.role === 'event') {
        return <p className="text-center text-[12px] text-muted-foreground px-6">{item.text}</p>
    }
    if (item.role === 'user') {
        return (
            <div className="flex justify-end">
                <p className="max-w-[85%] rounded-[20px] rounded-br-md bg-primary text-primary-foreground px-4 py-2 text-[16px] leading-snug whitespace-pre-wrap break-words">{item.text}</p>
            </div>
        )
    }
    return (
        <div className="max-w-[92%] text-[16px] leading-relaxed text-foreground">
            {item.text ? <RichText text={item.text} /> : item.streaming ? <TypingDots /> : null}
        </div>
    )
}

function TypingDots() {
    return (
        <span className="inline-flex gap-1 py-2" aria-label="Alice está escrevendo">
            {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}
        </span>
    )
}

function ActionCard({ action, onDecide, onNavigate }: { action: Extract<Item, { kind: 'action' }>; onDecide: (id: string, d: 'confirm' | 'reject') => void; onNavigate: () => void }) {
    const done = action.status === 'executed'
    const closed = ['rejected', 'failed', 'expired'].includes(action.status)
    return (
        <div className={cn('rounded-2xl border bg-card overflow-hidden', done ? 'border-green-500/40' : closed ? 'border-border/60 opacity-80' : 'border-primary/40')}>
            <div className="px-4 pt-3 pb-2 space-y-1">
                <p className="text-[12px] font-semibold text-primary flex items-center gap-1">
                    {done ? <><Check className="w-3.5 h-3.5 text-green-600" /> <span className="text-green-600 dark:text-green-400">Feito</span></>
                        : action.status === 'rejected' ? <><CircleX className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Cancelado</span></>
                            : action.status === 'expired' ? <><Clock className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Expirou</span></>
                                : action.status === 'failed' ? <><CircleX className="w-3.5 h-3.5 text-red-500" /> <span className="text-red-500">Não foi possível</span></>
                                    : 'Confirme para continuar'}
                </p>
                <p className="text-[16px] font-semibold">{action.title}</p>
                <ul className="text-[14px] text-muted-foreground space-y-0.5">
                    {action.lines.map((l, i) => <li key={i} className="break-words">{l}</li>)}
                </ul>
                {action.message && (done || closed) && <p className={cn('text-[14px] pt-1', done ? 'text-foreground' : 'text-red-600 dark:text-red-400')}>{action.message}</p>}
            </div>
            {(action.status === 'proposed' || action.status === 'working') && (
                <div className="grid grid-cols-2 border-t border-border/60">
                    <button type="button" disabled={action.status === 'working'} onClick={() => onDecide(action.id, 'reject')} className="h-12 text-[16px] text-muted-foreground hover:bg-foreground/[0.03] border-r border-border/60 disabled:opacity-50">Cancelar</button>
                    <button type="button" disabled={action.status === 'working'} onClick={() => onDecide(action.id, 'confirm')} className="h-12 text-[16px] font-semibold text-primary hover:bg-primary/5 flex items-center justify-center gap-2 disabled:opacity-50">
                        {action.status === 'working' ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirmar
                    </button>
                </div>
            )}
            {done && action.href && (
                <Link href={action.href} onClick={onNavigate} className="flex items-center justify-center gap-1.5 h-11 border-t border-border/60 text-[15px] text-primary hover:bg-primary/5">
                    Abrir <ExternalLink className="w-3.5 h-3.5" />
                </Link>
            )}
        </div>
    )
}
