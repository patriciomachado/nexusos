'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronDown, Loader2, RotateCcw } from 'lucide-react'
import { Field, Group, PrimaryButton, SwitchRow, TextArea, TextInput } from '@/components/ui/form'
import { MAX_MESSAGE_LENGTH, MESSAGE_EVENTS, MODULE_LABELS, SAMPLE_VARS, VAR_LABELS, renderTemplate, type MessageEvent, type MessageModule } from '@/lib/messages/catalog'
import { cn } from '@/lib/utils'

interface Config { auto: boolean; text: string }
interface Data {
    messages: ({ key: string } & Config)[]
    review_days: number
    google_review_url: string | null
    whatsapp_ready: boolean
    can_edit: boolean
}

const MODULE_ORDER: MessageModule[] = ['os', 'orcamentos', 'vendas', 'financeiro', 'agenda', 'clientes']

// Na Agenda, {servico} já vem com espaço e parênteses (" (Troca de tela)") ou vazio.
const sampleFor = (e: MessageEvent) => (e.key === 'agenda_lembrete' ? { ...SAMPLE_VARS, servico: ' (Troca de tela)' } : SAMPLE_VARS)

/**
 * Todas as mensagens que o app manda pro cliente pelo WhatsApp, por módulo:
 * o texto (com variáveis) e se sai sozinho. Só o dono edita.
 */
export default function MessagesSettings() {
    const [data, setData] = useState<Data | null>(null)
    const [draft, setDraft] = useState<Record<string, Config>>({})
    const [reviewDays, setReviewDays] = useState(2)
    const [open, setOpen] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const apply = (d: Pick<Data, 'messages' | 'review_days'>) => {
        setDraft(Object.fromEntries(d.messages.map(m => [m.key, { auto: m.auto, text: m.text }])))
        setReviewDays(d.review_days)
    }

    useEffect(() => {
        fetch('/api/settings/messages').then(r => (r.ok ? r.json() : null)).then((d: Data | null) => {
            if (!d) return
            setData(d)
            apply(d)
        }).catch(() => toast.error('Não foi possível carregar as mensagens.'))
    }, [])

    const set = (key: string, patch: Partial<Config>) => setDraft(p => ({ ...p, [key]: { ...p[key], ...patch } }))

    const save = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/settings/messages', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: draft, review_days: reviewDays }),
            })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(d.error || 'Não foi possível salvar')
            apply(d)
            toast.success('Mensagens salvas')
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    if (!data) return <div className="h-60 animate-pulse rounded-2xl bg-foreground/[0.04]" />
    const editable = data.can_edit

    return (
        <div className="space-y-6">
            {!data.whatsapp_ready && (
                <p className="rounded-2xl bg-orange-500/10 text-orange-800 dark:text-orange-300 px-4 py-3 text-[15px]">
                    Conecte o WhatsApp da loja em <Link href="/alice?aba=config" className="underline font-medium">Alice → Configurações</Link> para as mensagens saírem sozinhas. Sem ele, os botões de enviar abrem o WhatsApp com o texto pronto.
                </p>
            )}
            {!editable && <p className="px-1 text-[13px] text-muted-foreground">Só o dono da loja pode alterar as mensagens.</p>}

            {MODULE_ORDER.map(mod => (
                <Group key={mod} title={MODULE_LABELS[mod]}>
                    <div className="divide-y divide-border/60">
                        {MESSAGE_EVENTS.filter(e => e.module === mod).map(e => {
                            const cfg = draft[e.key] ?? { auto: e.defaultAuto, text: e.defaultText }
                            const isOpen = open === e.key
                            const needsGoogle = e.key === 'avaliacao' && !data.google_review_url
                            return (
                                <div key={e.key}>
                                    {e.canAuto === false ? (
                                        <div className="px-4 py-3 min-h-[52px]">
                                            <span className="block text-[17px]">{e.label}</span>
                                            <span className="block text-[13px] text-muted-foreground mt-0.5">{e.when}</span>
                                        </div>
                                    ) : (
                                        <fieldset disabled={!editable || needsGoogle} className="disabled:opacity-60">
                                            <SwitchRow
                                                label={e.label}
                                                description={needsGoogle ? <>Cadastre o link de avaliação do Google em <Link href="/settings/loja" className="underline">Dados da loja</Link> para ativar.</> : `${e.when} ${cfg.auto ? 'Envia sozinha.' : 'Desligada: não envia sozinha.'}`}
                                                checked={cfg.auto && !needsGoogle}
                                                onChange={v => set(e.key, { auto: v })}
                                            />
                                        </fieldset>
                                    )}
                                    <button type="button" onClick={() => setOpen(isOpen ? null : e.key)} aria-expanded={isOpen}
                                        className="w-full flex items-center gap-2 px-4 pb-3 -mt-1 text-left text-[14px] text-primary">
                                        <span className="flex-1 min-w-0 truncate">{isOpen ? 'Fechar mensagem' : 'Editar mensagem'}</span>
                                        <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', isOpen && 'rotate-180')} />
                                    </button>
                                    {isOpen && (
                                        <MessageEditor
                                            event={e}
                                            text={cfg.text}
                                            editable={editable}
                                            onChange={text => set(e.key, { text })}
                                            extra={e.key === 'avaliacao' ? (
                                                <Field label="Dias depois da entrega" htmlFor="msg-review-days">
                                                    <TextInput id="msg-review-days" inputMode="numeric" disabled={!editable} value={String(reviewDays)}
                                                        onChange={ev => setReviewDays(Math.min(Math.max(Number(ev.target.value.replace(/\D/g, '')) || 1, 1), 30))} />
                                                </Field>
                                            ) : null}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </Group>
            ))}

            {editable && (
                <div className="sticky bottom-4">
                    <PrimaryButton className="w-full shadow-lg" onClick={save} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton>
                </div>
            )}
        </div>
    )
}

function MessageEditor({ event, text, editable, onChange, extra }: {
    event: MessageEvent
    text: string
    editable: boolean
    onChange: (text: string) => void
    extra?: React.ReactNode
}) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const max = event.legacy ? 600 : MAX_MESSAGE_LENGTH

    // Coloca a variável onde está o cursor (ou no fim).
    const insert = (v: string) => {
        const el = ref.current
        const token = `{${v}}`
        const start = el?.selectionStart ?? text.length
        const end = el?.selectionEnd ?? text.length
        onChange((text.slice(0, start) + token + text.slice(end)).slice(0, max))
        requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length) })
    }

    return (
        <div className="px-4 pb-4 space-y-3">
            {extra}
            <TextArea ref={ref} id={`msg-${event.key}`} aria-label={`Mensagem: ${event.label}`} rows={5} maxLength={max} disabled={!editable} value={text} onChange={e => onChange(e.target.value)} />
            {editable && (
                <div className="space-y-1.5">
                    <p className="text-[13px] text-muted-foreground">Toque para inserir:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {event.vars.map(v => (
                            <button key={v} type="button" onClick={() => insert(v)} title={VAR_LABELS[v]}
                                className="h-8 px-3 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1] text-[13px] font-medium">
                                {`{${v}}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <ul className="text-[12px] text-muted-foreground space-y-0.5">
                {event.vars.map(v => <li key={v}><code>{`{${v}}`}</code> — {VAR_LABELS[v] ?? v}</li>)}
            </ul>
            <div className="rounded-2xl bg-emerald-500/[0.08] px-3 py-2.5">
                <p className="text-[12px] text-muted-foreground mb-1">Exemplo de como chega</p>
                <p className="text-[14px] whitespace-pre-wrap break-words">{renderTemplate(text, { loja: 'Sua loja', ...sampleFor(event) })}</p>
            </div>
            {editable && text !== event.defaultText && (
                <button type="button" onClick={() => onChange(event.defaultText)} className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground">
                    <RotateCcw className="w-3.5 h-3.5" /> Restaurar texto padrão
                </button>
            )}
        </div>
    )
}
