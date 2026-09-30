'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, ChevronLeft, Copy, Loader2, MessageCircle, Play, Sparkles, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { BottomBar, Chips, Field, Group, PrimaryButton, SecondaryButton, TextArea, TextInput, brl } from '@/components/ui/form'
import type { Brand } from '@/lib/studio/brand'
import { buildImagePrompt, buildVideoPrompt, FORMATS, TEMPLATES, type PostFormat, type PostTemplate } from '@/lib/studio/prompt'
import { CHANNELS, artLines, readyTexts, sourceTitle, type Channel, type Source, type Texts } from '@/lib/studio/sources'
import { cn } from '@/lib/utils'
import PromptPanel from './PromptPanel'
import { POST_STATUS, type AiQuota, type SavedPost } from './StudioClient'
import Teleprompter from './Teleprompter'

interface PromptState {
    template: PostTemplate
    format: PostFormat
    headline: string
    subline: string
    price: string
    priceNote: string
    /** Photos left out of the prompt. */
    hidden: string[]
}

const photosOf = (s: Source) => (s.type === 'os' || s.type === 'device' ? s.photos : [])

function initialPromptState(source: Source, saved?: Record<string, unknown> | null): PromptState {
    const lines = artLines(source)
    const photos = photosOf(source)
    const base: PromptState = {
        template: source.type === 'device' ? 'aparelho' : source.type === 'os' && photos.length >= 2 ? 'antes_depois' : 'destaque',
        format: 'feed',
        headline: source.type === 'os' && photos.length >= 2 ? `Antes e depois: ${lines.headline}` : lines.headline,
        subline: lines.subline,
        price: source.type === 'device' && source.price ? brl(source.price) : '',
        priceNote: source.type === 'device' && source.installment > source.price ? `ou ${brl(source.installment)} no cartão` : '',
        hidden: [],
    }
    if (!saved) return base
    const pick = <K extends keyof PromptState>(k: K) => (typeof saved[k] === typeof base[k] ? saved[k] as PromptState[K] : base[k])
    return {
        template: TEMPLATES.some(t => t.id === saved.template) ? saved.template as PostTemplate : base.template,
        format: FORMATS.some(f => f.id === saved.format) ? saved.format as PostFormat : base.format,
        headline: pick('headline'), subline: pick('subline'), price: pick('price'), priceNote: pick('priceNote'),
        hidden: Array.isArray(saved.hidden) ? (saved.hidden as unknown[]).filter((x): x is string => typeof x === 'string') : [],
    }
}

/** What the server needs to rebuild the source (never the photos or texts). */
function sourceRef(s: Source) {
    return s.type === 'manual' ? { type: s.type, topic: s.topic } : { type: s.type, id: s.id }
}

export default function Composer({ source, post, brand, ai, onAi, onSaved, onDeleted, onClose }: {
    source: Source
    post?: SavedPost
    brand: Brand
    ai: AiQuota
    onAi: (ai: AiQuota) => void
    onSaved: (post: SavedPost) => void
    onDeleted: (id: string) => void
    onClose: () => void
}) {
    const ready = useMemo(() => readyTexts(source, brand), [source, brand])
    const [texts, setTexts] = useState<Texts>(() => post ? {
        instagram: post.instagram_caption ?? ready.instagram,
        whatsapp: post.whatsapp_text ?? ready.whatsapp,
        google: post.google_post ?? ready.google,
        roteiro: post.body_script ?? ready.roteiro,
    } : ready)
    const [meta, setMeta] = useState<PromptState>(() => initialPromptState(source, post?.art))
    const [channel, setChannel] = useState<Channel>('instagram')
    const [status, setStatus] = useState<SavedPost['status']>(post?.status ?? 'ideia')
    const [scheduledFor, setScheduledFor] = useState(post?.scheduled_for?.slice(0, 10) ?? '')
    const [note, setNote] = useState('')
    const [writing, setWriting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [prompter, setPrompter] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const allPhotos = photosOf(source)
    const photos = allPhotos.filter(p => !meta.hidden.includes(p))
    const title = post?.title ?? sourceTitle(source)
    const set = (patch: Partial<PromptState>) => setMeta(m => ({ ...m, ...patch }))

    const promptInput = useMemo(() => ({
        template: meta.template,
        format: meta.format,
        brand,
        headline: meta.headline,
        subline: meta.subline,
        price: meta.price,
        priceNote: meta.priceNote,
        photoCount: photos.length,
    }), [meta, brand, photos.length])
    const imagePrompt = useMemo(() => buildImagePrompt(promptInput), [promptInput])
    const videoPrompt = useMemo(() => buildVideoPrompt(promptInput), [promptInput])

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(texts[channel])
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            toast.error('Não foi possível copiar')
        }
    }

    const writeWithAi = async () => {
        setWriting(true)
        try {
            const res = await fetch('/api/studio/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, source: sourceRef(source), note: note.trim() || undefined }),
            })
            const data = await res.json().catch(() => ({}))
            if (typeof data.used === 'number') onAi({ ...ai, used: data.used, limit: data.limit ?? ai.limit })
            if (!res.ok) throw new Error(data.error || 'Erro ao escrever com IA')
            setTexts(t => ({ ...t, [channel]: data.text }))
            setNote('')
            toast.success('Texto novo escrito')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erro ao escrever com IA')
        } finally {
            setWriting(false)
        }
    }

    const save = async (patch?: Partial<{ status: SavedPost['status'] }>) => {
        setSaving(true)
        try {
            const body = {
                id: post?.id,
                title,
                source_type: source.type,
                source_id: source.type === 'manual' ? null : source.id,
                ...texts,
                status: patch?.status ?? status,
                scheduled_for: scheduledFor || null,
                art: { template: meta.template, format: meta.format, headline: meta.headline, subline: meta.subline, price: meta.price, priceNote: meta.priceNote, hidden: meta.hidden.filter(h => h.startsWith('http')), topic: source.type === 'manual' ? source.topic : undefined },
            }
            const res = await fetch('/api/studio/scripts', { method: post ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
            onSaved(data as SavedPost)
            toast.success(post ? 'Post atualizado' : 'Post salvo')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        if (!post) return
        const res = await fetch(`/api/studio/scripts?id=${post.id}`, { method: 'DELETE' })
        if (!res.ok) return toast.error('Erro ao excluir')
        toast.success('Post excluído')
        onDeleted(post.id)
    }

    const left = Math.max(0, ai.limit - ai.used)
    const canAi = ai.configured && ai.limit > 0

    return (
        <div className="min-h-full bg-background">
            <Header title="Studio" />
            <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-3 pb-8">
                <div className="flex items-center gap-1 -ml-2 mb-3">
                    <button type="button" onClick={onClose} className="h-10 pl-1 pr-3 rounded-full flex items-center gap-0.5 text-[17px] text-primary hover:bg-foreground/[0.05] transition-colors">
                        <ChevronLeft aria-hidden className="w-6 h-6" /> Voltar
                    </button>
                    <h2 className="flex-1 min-w-0 text-[17px] font-semibold truncate">{title}</h2>
                    {post && (
                        <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Excluir post" className="w-10 h-10 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 aria-hidden className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                    {/* Prompt para IA de imagem/vídeo */}
                    <section className="space-y-3 lg:sticky lg:top-20">
                        <PromptPanel imagePrompt={imagePrompt} videoPrompt={videoPrompt} />

                        <Chips ariaLabel="Formato" options={FORMATS.map(f => ({ value: f.id, label: f.label }))} value={meta.format} onChange={format => set({ format })} />
                        <Chips ariaLabel="Estilo do post" options={TEMPLATES.map(t => ({ value: t.id, label: t.label }))} value={meta.template} onChange={template => set({ template })} />
                        {meta.template === 'antes_depois' && photos.length < 2 && (
                            <p className="text-[13px] text-muted-foreground px-1">Antes e depois precisa de 2 fotos: a primeira é o antes e a última, o depois.</p>
                        )}

                        {allPhotos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1" aria-label="Fotos de referência para a IA">
                                {allPhotos.map((p, i) => {
                                    const on = !meta.hidden.includes(p)
                                    return (
                                        <button key={i} type="button" aria-pressed={on} aria-label={`Foto ${i + 1}${on ? ', incluída no prompt' : ', fora do prompt'}`} onClick={() => set({ hidden: on ? [...meta.hidden, p] : meta.hidden.filter(h => h !== p) })} className={cn('relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition', on ? 'border-primary' : 'border-transparent opacity-40')}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={p} alt="" className="w-full h-full object-cover" />
                                            {on && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Check aria-hidden className="w-3 h-3" strokeWidth={3} /></span>}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        <Group>
                            <Field label="Título do post" htmlFor="prompt-headline"><TextInput id="prompt-headline" value={meta.headline} onChange={e => set({ headline: e.target.value })} maxLength={90} /></Field>
                            <Field label="Linha de apoio" htmlFor="prompt-subline"><TextInput id="prompt-subline" value={meta.subline} onChange={e => set({ subline: e.target.value })} maxLength={140} /></Field>
                            {(meta.template === 'aparelho' || meta.price) && (
                                <>
                                    <Field label="Preço em destaque" htmlFor="prompt-price"><TextInput id="prompt-price" value={meta.price} onChange={e => set({ price: e.target.value })} maxLength={30} placeholder="R$ 1.999" /></Field>
                                    <Field label="Abaixo do preço" htmlFor="prompt-note"><TextInput id="prompt-note" value={meta.priceNote} onChange={e => set({ priceNote: e.target.value })} maxLength={60} placeholder="ou 10x no cartão" /></Field>
                                </>
                            )}
                        </Group>
                    </section>

                    {/* Texts */}
                    <section className="space-y-4">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4" role="tablist" aria-label="Canal">
                            {CHANNELS.map(c => (
                                <button key={c.id} type="button" role="tab" aria-selected={channel === c.id} onClick={() => setChannel(c.id)} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium transition-colors', channel === c.id ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}>
                                    {c.label}
                                </button>
                            ))}
                        </div>

                        <Group
                            footer={texts[channel] !== ready[channel]
                                ? <button type="button" className="text-primary" onClick={() => setTexts(t => ({ ...t, [channel]: ready[channel] }))}>Voltar ao texto pronto</button>
                                : 'Texto pronto com os dados da loja. Edite à vontade.'}
                        >
                            <div className="px-4 py-3">
                                <TextArea aria-label={`Texto para ${CHANNELS.find(c => c.id === channel)?.label}`} value={texts[channel]} onChange={e => setTexts(t => ({ ...t, [channel]: e.target.value }))} rows={channel === 'roteiro' ? 14 : 10} className="text-[16px]" />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                                <SecondaryButton onClick={copy} className="h-10 px-4 text-[15px]">{copied ? <Check aria-hidden className="w-4 h-4" /> : <Copy aria-hidden className="w-4 h-4" />} {copied ? 'Copiado' : 'Copiar'}</SecondaryButton>
                                {channel === 'whatsapp' && (
                                    <a href={`https://wa.me/?text=${encodeURIComponent(texts.whatsapp)}`} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 text-[15px] font-medium inline-flex items-center gap-1.5">
                                        <MessageCircle aria-hidden className="w-4 h-4" /> Enviar
                                    </a>
                                )}
                                {channel === 'roteiro' && (
                                    <SecondaryButton onClick={() => setPrompter(true)} className="h-10 px-4 text-[15px]"><Play aria-hidden className="w-4 h-4" /> Teleprompter</SecondaryButton>
                                )}
                            </div>
                        </Group>

                        {canAi && (
                            <Group title="Escrever com IA" footer={left ? `Usa 1 dos ${left} textos com IA que restam este mês. Só este canal é reescrito.` : `Os ${ai.limit} textos com IA deste mês acabaram. O texto pronto continua disponível.`}>
                                <Field label="Pedido (opcional)" htmlFor="ai-note">
                                    <TextInput id="ai-note" value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Ex.: mais divertido, cite a garantia de 6 meses" />
                                </Field>
                                <div className="px-4 py-3">
                                    <button type="button" onClick={writeWithAi} disabled={writing || !left} className="h-10 px-4 rounded-full bg-violet-500/12 text-violet-700 dark:text-violet-300 text-[15px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50">
                                        {writing ? <Loader2 aria-hidden className="w-4 h-4 animate-spin" /> : <Sparkles aria-hidden className="w-4 h-4" />}
                                        {writing ? 'Escrevendo…' : `Reescrever ${CHANNELS.find(c => c.id === channel)?.label}`}
                                    </button>
                                </div>
                            </Group>
                        )}

                        <Group title="Planejamento">
                            <div className="px-4 py-3">
                                <Chips ariaLabel="Situação do post" options={(Object.keys(POST_STATUS) as SavedPost['status'][]).map(s => ({ value: s, label: POST_STATUS[s].label }))} value={status} onChange={setStatus} />
                            </div>
                            <Field label="Publicar em" htmlFor="post-date">
                                <TextInput id="post-date" type="date" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
                            </Field>
                        </Group>
                    </section>
                </div>

                <BottomBar>
                    <SecondaryButton onClick={onClose} className="flex-1 sm:flex-none">Fechar</SecondaryButton>
                    <PrimaryButton onClick={() => save()} disabled={saving} className="flex-1">
                        {saving ? <Loader2 aria-hidden className="w-5 h-5 animate-spin" /> : <Check aria-hidden className="w-5 h-5" />}
                        {post ? 'Salvar alterações' : 'Salvar post'}
                    </PrimaryButton>
                </BottomBar>
            </div>

            <Teleprompter open={prompter} onClose={() => setPrompter(false)} title={title} text={texts.roteiro} />
            <PremiumConfirmDialog
                isOpen={confirmDelete}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => { setConfirmDelete(false); void remove() }}
                title="Excluir post?"
                description="O post salvo sai da lista. A OS ou o aparelho de origem não mudam."
                confirmLabel="Excluir"
                variant="danger"
            />
        </div>
    )
}
