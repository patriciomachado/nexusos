'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, ChevronRight, ClipboardList, Flame, Loader2, Palette, Plus, Smartphone, Sparkles, Wrench } from 'lucide-react'
import Header from '@/components/layout/Header'
import { Group, PrimaryButton, TextInput, brl } from '@/components/ui/form'
import { localDateString } from '@/lib/tasks/dates'
import { upcomingEvents } from '@/lib/studio/events'
import type { Brand } from '@/lib/studio/brand'
import type { Source } from '@/lib/studio/sources'
import { publishStreak } from '@/lib/studio/streak'
import { cn } from '@/lib/utils'
import Composer from './Composer'
import BrandSheet from './BrandSheet'

/**
 * Studio: posts for Instagram, WhatsApp and Google made from what the store
 * already has (finished repairs, devices for sale, dates that sell). Art and
 * ready-made texts are free; the AI writes a text only when asked, within
 * the plan's monthly cap.
 */

export interface OsItem { id: string; number: string | null; device: string; solution: string; photos: number; thumb: string | null }
export interface DeviceItem { id: string; name: string; price: number }
export interface SavedPost {
    id: string
    title: string
    source_type: string | null
    source_id: string | null
    instagram_caption: string | null
    whatsapp_text: string | null
    google_post: string | null
    body_script: string | null
    status: 'ideia' | 'pronto' | 'publicado'
    scheduled_for: string | null
    art: Record<string, unknown> | null
    created_at: string
    published_at: string | null
}
export interface AiQuota { used: number; limit: number; configured: boolean }

type SourceRef = { type: 'os' | 'device'; id: string } | { type: 'seasonal'; id: string } | { type: 'manual'; topic: string }

export const POST_STATUS: Record<SavedPost['status'], { label: string; tone: string; dot: string }> = {
    ideia: { label: 'Ideia', tone: 'bg-foreground/[0.06] text-muted-foreground', dot: 'bg-sky-500' },
    pronto: { label: 'Pronto', tone: 'bg-amber-500/15 text-amber-800 dark:text-amber-400', dot: 'bg-amber-500' },
    publicado: { label: 'Publicado', tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
}

const TABS = [
    { id: 'criar', label: 'Criar' },
    { id: 'calendario', label: 'Calendário' },
    { id: 'salvos', label: 'Salvos' },
] as const
type Tab = typeof TABS[number]['id']

const dateLabel = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })

export default function StudioClient({ brand: initialBrand, orders, devices, initialPosts, ai: initialAi, canEditBrand, open }: {
    brand: Brand
    orders: OsItem[]
    devices: DeviceItem[]
    initialPosts: SavedPost[]
    ai: AiQuota
    canEditBrand: boolean
    open: SourceRef | null
}) {
    const [tab, setTab] = useState<Tab>('criar')
    const [brand, setBrand] = useState(initialBrand)
    const [posts, setPosts] = useState(initialPosts)
    const [ai, setAi] = useState(initialAi)
    const [editing, setEditing] = useState<{ key: number; source: Source; post?: SavedPost } | null>(null)
    const [loading, setLoading] = useState<string | null>(null)
    const [brandOpen, setBrandOpen] = useState(false)
    const [topic, setTopic] = useState('')
    const [showAllOs, setShowAllOs] = useState(false)
    const [filter, setFilter] = useState<'todos' | SavedPost['status']>('todos')

    const events = useMemo(() => upcomingEvents(new Date(), 12), [])
    const today = useMemo(() => localDateString(), [])
    const publishedDays = useMemo(() => new Set(posts.filter(p => p.published_at).map(p => p.published_at!.slice(0, 10))), [posts])
    const streak = publishStreak(publishedDays, today)

    /** Seasonal and manual sources are built right here; OS and devices come with their photos from the server. */
    const openSource = async (ref: SourceRef, post?: SavedPost) => {
        if (ref.type === 'seasonal' || ref.type === 'manual') {
            setEditing({ key: Date.now(), source: ref.type === 'manual' ? { type: 'manual', topic: ref.topic } : ref, post })
            return
        }
        const key = `${ref.type}:${ref.id}`
        setLoading(key)
        try {
            const res = await fetch(`/api/studio/source?type=${ref.type}&id=${encodeURIComponent(ref.id)}`)
            if (!res.ok) throw new Error()
            setEditing({ key: Date.now(), source: await res.json() as Source, post })
        } catch {
            toast.error(ref.type === 'os' ? 'OS não encontrada' : 'Aparelho não encontrado')
        } finally {
            setLoading(null)
        }
    }

    // Opened from another screen (OS → "Criar post no Studio").
    useEffect(() => {
        if (open) void openSource(open)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const openPost = (p: SavedPost) => {
        const t = p.source_type
        if ((t === 'os' || t === 'device' || t === 'seasonal') && p.source_id) void openSource({ type: t, id: p.source_id }, p)
        else void openSource({ type: 'manual', topic: typeof p.art?.topic === 'string' ? p.art.topic : p.title }, p)
    }

    const saved = (p: SavedPost) => setPosts(list => [p, ...list.filter(x => x.id !== p.id)])
    const removed = (id: string) => setPosts(list => list.filter(x => x.id !== id))

    if (editing) {
        return (
            <Composer
                key={editing.key}
                source={editing.source}
                post={editing.post}
                brand={brand}
                ai={ai}
                onAi={setAi}
                onSaved={p => { saved(p); setEditing(e => (e ? { ...e, post: p } : e)) }}
                onDeleted={id => { removed(id); setEditing(null) }}
                onClose={() => setEditing(null)}
            />
        )
    }

    const scheduled = posts.filter(p => p.scheduled_for && p.status !== 'publicado').sort((a, b) => a.scheduled_for!.localeCompare(b.scheduled_for!))
    const filtered = filter === 'todos' ? posts : posts.filter(p => p.status === filter)
    const visibleOs = showAllOs ? orders : orders.slice(0, 5)

    return (
        <div className="min-h-full bg-background">
            <Header title="Studio" />
            <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 pb-16 space-y-5">
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex p-1 rounded-full bg-foreground/[0.06]" role="tablist" aria-label="Seções do Studio">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.id}
                                onClick={() => setTab(t.id)}
                                className={cn('flex-1 h-9 rounded-full text-[15px] font-medium transition-colors', tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => setBrandOpen(true)} aria-label="Marca da loja" className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-primary hover:bg-foreground/[0.05] transition-colors">
                        <Palette aria-hidden className="w-5 h-5" />
                    </button>
                </div>

                {streak > 0 && <StreakBanner streak={streak} publishedToday={publishedDays.has(today)} />}

                {tab === 'criar' && (
                    <>
                        <QuotaNote ai={ai} />

                        <Group title="Serviços concluídos" footer={orders.length ? 'Fotos da OS viram arte de antes e depois.' : undefined}>
                            {orders.length === 0 && <Empty icon={ClipboardList} text="As OS concluídas aparecem aqui para virar post." />}
                            {visibleOs.map(o => (
                                <SourceRow
                                    key={o.id}
                                    loading={loading === `os:${o.id}`}
                                    onClick={() => openSource({ type: 'os', id: o.id })}
                                    thumb={o.thumb}
                                    icon={Wrench}
                                    title={o.device}
                                    detail={[o.number && `OS ${o.number}`, o.solution, o.photos ? `${o.photos} foto${o.photos > 1 ? 's' : ''}` : 'sem fotos'].filter(Boolean).join(' · ')}
                                />
                            ))}
                            {orders.length > 5 && !showAllOs && (
                                <button type="button" onClick={() => setShowAllOs(true)} className="w-full px-4 min-h-[48px] text-left text-[15px] text-primary hover:bg-foreground/[0.02]">Ver todas ({orders.length})</button>
                            )}
                        </Group>

                        <Group title="Aparelhos à venda">
                            {devices.length === 0 && <Empty icon={Smartphone} text="Aparelhos disponíveis em Venda de Aparelhos aparecem aqui." />}
                            {devices.slice(0, 8).map(d => (
                                <SourceRow
                                    key={d.id}
                                    loading={loading === `device:${d.id}`}
                                    onClick={() => openSource({ type: 'device', id: d.id })}
                                    icon={Smartphone}
                                    title={d.name}
                                    detail={d.price ? brl(d.price) : 'Sem preço'}
                                />
                            ))}
                        </Group>

                        <Group title="Datas que vêm aí" action={<button type="button" onClick={() => setTab('calendario')} className="text-[13px] text-primary">Ver calendário</button>}>
                            {events.slice(0, 3).map(({ event, date, days }) => (
                                <SourceRow
                                    key={event.id}
                                    onClick={() => openSource({ type: 'seasonal', id: event.id })}
                                    icon={CalendarDays}
                                    title={event.title}
                                    detail={`${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} · ${days === 0 ? 'hoje' : `em ${days} dia${days > 1 ? 's' : ''}`}`}
                                />
                            ))}
                        </Group>

                        <Group title="Post livre" footer="Uma oferta, um aviso, uma novidade da loja.">
                            <form
                                className="flex items-center gap-2 px-4 py-2"
                                onSubmit={e => { e.preventDefault(); if (topic.trim()) void openSource({ type: 'manual', topic: topic.trim() }) }}
                            >
                                <TextInput value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ex.: Película 3D com 20% off" aria-label="Assunto do post" maxLength={200} />
                                <PrimaryButton type="submit" disabled={!topic.trim()} className="h-10 px-4 text-[15px] shrink-0"><Plus aria-hidden className="w-4 h-4" /> Criar</PrimaryButton>
                            </form>
                        </Group>
                    </>
                )}

                {tab === 'calendario' && (
                    <>
                        {scheduled.length > 0 && (
                            <Group title="Seus posts programados">
                                {scheduled.map(p => <PostRow key={p.id} post={p} onClick={() => openPost(p)} date />)}
                            </Group>
                        )}
                        <Group title="Datas que vendem" footer="Cada data já vem com arte e textos prontos com o nome, a cidade e o WhatsApp da loja.">
                            {events.map(({ event, date, days }) => (
                                <button key={event.id} type="button" onClick={() => openSource({ type: 'seasonal', id: event.id })} className="w-full flex items-center gap-3 px-4 py-3 min-h-[60px] text-left hover:bg-foreground/[0.02] transition-colors">
                                    <span className="w-12 shrink-0 text-center">
                                        <span className="block text-[11px] font-medium uppercase text-muted-foreground">{date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                        <span className="block text-[20px] font-semibold tabular-nums leading-tight">{date.getDate()}</span>
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[15px] font-medium truncate">{event.title}</span>
                                        <span className="block text-[13px] text-muted-foreground line-clamp-2">{event.why}</span>
                                    </span>
                                    <span className="text-[12px] text-muted-foreground shrink-0">{days === 0 ? 'hoje' : `${days} d`}</span>
                                    <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                </button>
                            ))}
                        </Group>
                    </>
                )}

                {tab === 'salvos' && (
                    <>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4" role="radiogroup" aria-label="Filtrar por situação">
                            {(['todos', 'ideia', 'pronto', 'publicado'] as const).map(s => (
                                <button key={s} type="button" role="radio" aria-checked={filter === s} onClick={() => setFilter(s)} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium transition-colors', filter === s ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}>
                                    {s === 'todos' ? `Todos (${posts.length})` : `${POST_STATUS[s].label} (${posts.filter(p => p.status === s).length})`}
                                </button>
                            ))}
                        </div>
                        {filtered.length ? (
                            <Group>
                                {filtered.map(p => <PostRow key={p.id} post={p} onClick={() => openPost(p)} />)}
                            </Group>
                        ) : (
                            <div className="py-12 text-center text-[15px] text-muted-foreground">
                                {posts.length ? 'Nenhum post nesta situação.' : 'Os posts que você salvar aparecem aqui.'}
                            </div>
                        )}
                    </>
                )}
            </div>

            <BrandSheet open={brandOpen} onClose={() => setBrandOpen(false)} brand={brand} canEdit={canEditBrand} onSaved={setBrand} />
        </div>
    )
}

function StreakBanner({ streak, publishedToday }: { streak: number; publishedToday: boolean }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-orange-500/[0.08] text-[13px]">
            <Flame aria-hidden className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
            <span className="flex-1 min-w-0 text-muted-foreground">
                <b className="text-foreground tabular-nums">{streak}</b> dia{streak > 1 ? 's' : ''} seguido{streak > 1 ? 's' : ''} publicando conteúdo.{' '}
                {publishedToday ? 'Continue assim! 🔥' : 'Publique algo hoje para manter a sequência.'}
            </span>
        </div>
    )
}

function QuotaNote({ ai }: { ai: AiQuota }) {
    if (!ai.limit) return null
    const left = Math.max(0, ai.limit - ai.used)
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-violet-500/[0.08] text-[13px]">
            <Sparkles aria-hidden className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="flex-1 min-w-0 text-muted-foreground">
                Artes e textos prontos são ilimitados. {ai.configured ? <>Textos com IA: <b className="text-foreground tabular-nums">{left}</b> de {ai.limit} restantes este mês.</> : 'A IA ainda não está configurada.'}
            </span>
        </div>
    )
}

function SourceRow({ onClick, icon: Icon, thumb, title, detail, loading }: {
    onClick: () => void
    icon: React.ComponentType<{ className?: string }>
    thumb?: string | null
    title: string
    detail: string
    loading?: boolean
}) {
    return (
        <button type="button" onClick={onClick} disabled={loading} className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[60px] text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.04] transition-colors disabled:opacity-60">
            {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 bg-foreground/[0.06]" />
            ) : (
                <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
            )}
            <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium truncate">{title}</span>
                <span className="block text-[13px] text-muted-foreground truncate">{detail}</span>
            </span>
            {loading ? <Loader2 aria-hidden className="w-4 h-4 animate-spin text-muted-foreground" /> : <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/70 shrink-0" />}
        </button>
    )
}

function PostRow({ post, onClick, date }: { post: SavedPost; onClick: () => void; date?: boolean }) {
    const st = POST_STATUS[post.status] ?? POST_STATUS.ideia
    return (
        <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[56px] text-left hover:bg-foreground/[0.02] transition-colors">
            <span className={cn('w-2 h-2 rounded-full shrink-0', st.dot)} aria-hidden />
            <span className="flex-1 min-w-0">
                <span className="block text-[15px] truncate">{post.title}</span>
                <span className="block text-[12px] text-muted-foreground capitalize">
                    {date && post.scheduled_for ? dateLabel(post.scheduled_for) : new Date(post.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    {post.scheduled_for && !date ? ` · para ${dateLabel(post.scheduled_for)}` : ''}
                </span>
            </span>
            <span className={cn('text-[12px] font-medium px-2 py-0.5 rounded-full shrink-0', st.tone)}>{st.label}</span>
            <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/70 shrink-0" />
        </button>
    )
}

function Empty({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
    return (
        <div className="flex items-center gap-3 px-4 py-4 text-[13px] text-muted-foreground">
            <Icon className="w-5 h-5 shrink-0 opacity-60" />
            {text}
        </div>
    )
}
