'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2, MessageCircle, RefreshCw, Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { Chips, Group, PrimaryButton, SecondaryButton, TextArea } from '@/components/ui/form'

interface Review {
    name: string
    author: string
    photo: string | null
    rating: number
    comment: string | null
    created_at: string
    reply: { comment: string; updated_at: string } | null
    match: { customer: { id: string; name: string; phone: string | null }; exact: boolean } | null
    last_os: { id: string; order_number: string; title: string; date: string } | null
}

type Data =
    | { state: 'not_configured' }
    | { state: 'disconnected' }
    | { state: 'choose_location'; email: string | null }
    | { state: 'error'; error: string; location: string | null }
    | { state: 'ok'; location: string | null; email: string | null; average: number | null; total: number; nextPageToken: string | null; reviews: Review[] }

type Filter = 'all' | 'unanswered' | 'low'

const FLASH: Record<string, [ok: boolean, text: string]> = {
    conectado: [true, 'Google conectado'],
    cancelado: [false, 'Conexão com o Google cancelada'],
    expirou: [false, 'O pedido expirou. Toque em Conectar de novo.'],
    'sem-permissao': [false, 'Só o dono pode conectar o Google'],
    'sem-tabela': [false, 'Falta rodar a migração 20261004 no Supabase'],
    erro: [false, 'Não foi possível conectar o Google. Tente de novo.'],
}

const firstName = (n: string) => n.split(' ')[0]
const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function waLink(phone: string | null, text: string) {
    let d = (phone ?? '').replace(/\D/g, '')
    if (d.length < 10) return null
    if (!d.startsWith('55')) d = `55${d}`
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

function Stars({ value }: { value: number }) {
    return (
        <span className="inline-flex" aria-label={`${value} de 5 estrelas`}>
            {[1, 2, 3, 4, 5].map(i => <Star key={i} aria-hidden className={cn('w-3.5 h-3.5', i <= value ? 'fill-amber-400 text-amber-400' : 'text-foreground/15')} />)}
        </span>
    )
}

/**
 * Pós-venda → Google: the store's reviews on its Google Business Profile,
 * who wrote each one (matched with Clientes by name), and public answers.
 */
export default function GoogleReviews({ owner, storeName, flash }: { owner: boolean; storeName: string; flash?: string | null }) {
    const router = useRouter()
    const [data, setData] = useState<Data | null>(null)
    const [loadingMore, setLoadingMore] = useState(false)
    const [filter, setFilter] = useState<Filter>('all')
    const [replying, setReplying] = useState<Review | null>(null)
    const [confirmOff, setConfirmOff] = useState(false)

    const load = useCallback(async () => {
        setData(null)
        try {
            const res = await fetch('/api/google/reviews')
            setData(res.ok ? await res.json() : { state: 'error', error: 'Não foi possível carregar as avaliações.', location: null })
        } catch {
            setData({ state: 'error', error: 'Sem conexão. Tente de novo.', location: null })
        }
    }, [])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        if (!flash || !FLASH[flash]) return
        const [ok, text] = FLASH[flash]
        if (ok) toast.success(text)
        else toast.error(text)
        router.replace('/post-sales?tab=google', { scroll: false })
    }, [flash, router])

    const more = async () => {
        if (data?.state !== 'ok' || !data.nextPageToken) return
        setLoadingMore(true)
        try {
            const res = await fetch(`/api/google/reviews?pageToken=${encodeURIComponent(data.nextPageToken)}`)
            const next = await res.json() as Data
            if (next.state === 'ok') setData({ ...data, nextPageToken: next.nextPageToken, reviews: [...data.reviews, ...next.reviews] })
        } finally {
            setLoadingMore(false)
        }
    }

    const disconnect = async () => {
        setConfirmOff(false)
        const res = await fetch('/api/google', { method: 'DELETE' })
        if (res.ok) { toast.success('Google desconectado'); load() }
        else toast.error('Não foi possível desconectar. Tente de novo.')
    }

    if (!data) {
        return (
            <div className="space-y-3" aria-busy>
                {[0, 1, 2].map(i => <div key={i} className="h-28 rounded-2xl bg-foreground/[0.04] animate-pulse" />)}
            </div>
        )
    }

    if (data.state === 'not_configured') {
        return <Notice title="Avaliações do Google" text="A leitura das avaliações do Google ainda não foi ativada neste app. Enquanto isso, use a aba Contatar para convidar quem deu 5 estrelas a avaliar a loja no Google." />
    }

    if (data.state === 'disconnected') {
        return (
            <Notice
                title="Conecte o Perfil da Empresa no Google"
                text={owner
                    ? 'Veja aqui todas as avaliações da loja no Google, quem já é seu cliente e responda sem sair do app. Entre com a conta do Google que administra o perfil da loja. No iPhone, faça essa conexão pelo computador ou abrindo o site no Safari.'
                    : 'Peça ao dono da loja para conectar o Google em Pós-venda → Google.'}
            >
                {owner && <a href="/api/google/connect" className="inline-flex h-12 px-6 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold items-center justify-center">Conectar com o Google</a>}
            </Notice>
        )
    }

    if (data.state === 'choose_location') {
        return owner
            ? <LocationPicker email={data.email} onDone={load} onDisconnect={() => setConfirmOff(true)} extra={<DisconnectDialog open={confirmOff} onConfirm={disconnect} onCancel={() => setConfirmOff(false)} />} />
            : <Notice title="Quase lá" text="O dono da loja precisa escolher qual empresa do Google mostrar aqui." />
    }

    if (data.state === 'error') {
        return (
            <Notice title={data.location ?? 'Avaliações do Google'} text={data.error}>
                <div className="flex flex-wrap justify-center gap-2">
                    <SecondaryButton onClick={load}><RefreshCw aria-hidden className="w-4 h-4" /> Tentar de novo</SecondaryButton>
                    {owner && <a href="/api/google/connect" className="inline-flex h-12 px-5 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold items-center">Conectar de novo</a>}
                </div>
            </Notice>
        )
    }

    const unanswered = data.reviews.filter(r => !r.reply)
    const low = data.reviews.filter(r => r.rating > 0 && r.rating <= 3)
    const shown = filter === 'unanswered' ? unanswered : filter === 'low' ? low : data.reviews
    const known = data.reviews.filter(r => r.match).length

    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-4">
                <div className="text-center shrink-0">
                    <p className="text-[34px] leading-none font-bold tabular-nums">{data.average != null ? data.average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}</p>
                    <Stars value={Math.round(data.average ?? 0)} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold truncate">{data.location ?? 'Google'}</p>
                    <p className="text-[13px] text-muted-foreground">{data.total} avaliaç{data.total === 1 ? 'ão' : 'ões'} no Google · {known} de clientes cadastrados</p>
                </div>
                <button type="button" onClick={load} aria-label="Atualizar" className="w-10 h-10 rounded-full hover:bg-foreground/[0.05] flex items-center justify-center shrink-0">
                    <RefreshCw aria-hidden className="w-[18px] h-[18px] text-muted-foreground" />
                </button>
            </div>

            <Chips<Filter> ariaLabel="Filtrar avaliações" value={filter} onChange={setFilter} options={[
                { value: 'all', label: 'Todas' },
                { value: 'unanswered', label: `Sem resposta${unanswered.length ? ` (${unanswered.length})` : ''}` },
                { value: 'low', label: `3★ ou menos${low.length ? ` (${low.length})` : ''}` },
            ]} />

            {shown.length === 0 ? (
                <p className="py-8 text-center text-[15px] text-muted-foreground">{data.reviews.length ? 'Nenhuma avaliação com esse filtro.' : 'A loja ainda não tem avaliações no Google.'}</p>
            ) : (
                <ul className="space-y-3">
                    {shown.map(r => <ReviewCard key={r.name} r={r} storeName={storeName} onReply={() => setReplying(r)} />)}
                </ul>
            )}

            {data.nextPageToken && filter === 'all' && (
                <SecondaryButton className="w-full" onClick={more} disabled={loadingMore}>
                    {loadingMore && <Loader2 aria-hidden className="w-4 h-4 animate-spin" />} Ver mais antigas
                </SecondaryButton>
            )}

            <p className="px-1 text-[12px] text-muted-foreground text-pretty">
                O cliente é reconhecido pelo nome igual ao do cadastro. &quot;Parece ser&quot; quando bate só o primeiro e o último nome.
                {data.email && <> Conectado como {data.email}.</>}
            </p>
            {owner && (
                <div className="flex gap-4 px-1 text-[13px]">
                    <a href="/api/google/connect" className="text-primary">Trocar conta</a>
                    <button type="button" onClick={() => setConfirmOff(true)} className="text-red-600 dark:text-red-400">Desconectar</button>
                </div>
            )}

            {replying && (
                <ReplySheet
                    review={replying}
                    storeName={storeName}
                    onClose={() => setReplying(null)}
                    onSaved={reply => {
                        setData(d => d?.state === 'ok' ? { ...d, reviews: d.reviews.map(x => x.name === replying.name ? { ...x, reply } : x) } : d)
                        setReplying(null)
                    }}
                />
            )}
            <DisconnectDialog open={confirmOff} onConfirm={disconnect} onCancel={() => setConfirmOff(false)} />
        </div>
    )
}

function DisconnectDialog({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
    return (
        <PremiumConfirmDialog
            isOpen={open}
            title="Desconectar o Google?"
            description="As avaliações deixam de aparecer aqui e os avisos de avaliação nova param. Nada muda no Google."
            confirmLabel="Desconectar"
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}

function Notice({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 px-5 py-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/15 flex items-center justify-center">
                <Star aria-hidden className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-[20px] font-semibold text-balance">{title}</h2>
                <p className="text-[15px] text-muted-foreground text-pretty max-w-md mx-auto">{text}</p>
            </div>
            {children}
        </div>
    )
}

function ReviewCard({ r, storeName, onReply }: { r: Review; storeName: string; onReply: () => void }) {
    const c = r.match?.customer
    const wa = c && r.rating <= 3
        ? waLink(c.phone, `Olá ${firstName(c.name)}, aqui é da ${storeName}. Vimos sua avaliação no Google e queremos entender o que aconteceu para resolver. Podemos conversar?`)
        : null
    return (
        <li className="rounded-2xl bg-card border border-border/60 p-4 space-y-2.5">
            <div className="flex items-center gap-3">
                {r.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo} alt="" width={40} height={40} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover bg-foreground/5" />
                ) : (
                    <span className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">{r.author.charAt(0).toUpperCase()}</span>
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-medium truncate">{r.author}</p>
                    <p className="text-[12px] text-muted-foreground flex items-center gap-1.5"><Stars value={r.rating} /> {date(r.created_at)}</p>
                </div>
            </div>

            {r.comment && <p className="text-[15px] text-foreground/90 whitespace-pre-line text-pretty">{r.comment}</p>}

            {c && (
                <div className="rounded-xl bg-foreground/[0.04] px-3 py-2 flex items-center gap-2">
                    <div className="min-w-0 flex-1 text-[13px]">
                        <p className="truncate">
                            <span className="text-muted-foreground">{r.match!.exact ? 'Cliente: ' : 'Parece ser: '}</span>
                            <Link href={`/customers/${c.id}`} className="font-medium text-primary">{c.name}</Link>
                        </p>
                        {r.last_os && (
                            <Link href={`/service-orders/${r.last_os.id}`} className="block truncate text-muted-foreground hover:text-primary">
                                Última OS #{r.last_os.order_number}{r.last_os.title ? ` · ${r.last_os.title}` : ''} · {date(r.last_os.date)}
                            </Link>
                        )}
                    </div>
                    {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-full bg-green-500/12 text-green-700 dark:text-green-400 text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0">
                            <MessageCircle aria-hidden className="w-3.5 h-3.5" /> Chamar
                        </a>
                    )}
                </div>
            )}

            {r.reply ? (
                <button type="button" onClick={onReply} className="w-full text-left rounded-xl border-l-2 border-primary/60 bg-primary/[0.04] px-3 py-2">
                    <p className="text-[12px] text-muted-foreground">Sua resposta · {date(r.reply.updated_at)} · toque para editar</p>
                    <p className="text-[14px] text-foreground/85 line-clamp-3">{r.reply.comment}</p>
                </button>
            ) : (
                <button type="button" onClick={onReply} className="h-9 px-4 rounded-full bg-primary/10 text-primary text-[14px] font-semibold">Responder</button>
            )}
        </li>
    )
}

function ReplySheet({ review, storeName, onClose, onSaved }: {
    review: Review
    storeName: string
    onClose: () => void
    onSaved: (reply: Review['reply']) => void
}) {
    const name = firstName(review.match?.customer.name ?? review.author)
    const templates = [
        { value: 'thanks', label: 'Agradecer', text: `Olá, ${name}! Muito obrigado pela avaliação. Ficamos felizes em ajudar e estamos à disposição sempre que precisar. Equipe ${storeName}.` },
        { value: 'sorry', label: 'Pedir desculpas', text: `Olá, ${name}. Sentimos muito pela sua experiência. Queremos entender o que aconteceu e resolver: chame a gente no WhatsApp ou venha até a loja. Equipe ${storeName}.` },
    ]
    const [text, setText] = useState(review.reply?.comment ?? (review.rating >= 4 ? templates[0].text : review.rating ? templates[1].text : ''))
    const [busy, setBusy] = useState(false)

    const publish = async () => {
        if (!text.trim()) { toast.error('Escreva a resposta'); return }
        setBusy(true)
        try {
            const res = await fetch('/api/google/reviews/reply', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: review.name, comment: text.trim() }) })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(d.error || 'Não foi possível publicar a resposta.')
            toast.success('Resposta publicada no Google')
            onSaved(d.reply)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        setBusy(true)
        try {
            const res = await fetch(`/api/google/reviews/reply?name=${encodeURIComponent(review.name)}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Resposta apagada')
            onSaved(null)
        } catch {
            toast.error('Não foi possível apagar a resposta.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet
            open
            onClose={onClose}
            title={review.reply ? 'Editar resposta' : 'Responder'}
            subtitle={`${review.author} · ${review.rating}★`}
            footer={
                <div className="flex gap-2">
                    {review.reply && <SecondaryButton onClick={remove} disabled={busy} className="text-red-600 dark:text-red-400">Apagar</SecondaryButton>}
                    <PrimaryButton className="flex-1" onClick={publish} disabled={busy}>
                        {busy && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />} Publicar
                    </PrimaryButton>
                </div>
            }
        >
            <div className="space-y-4">
                {review.comment && <p className="text-[14px] text-muted-foreground line-clamp-4 px-1">“{review.comment}”</p>}
                <Chips ariaLabel="Modelos de resposta" value="" onChange={v => setText(templates.find(t => t.value === v)?.text ?? text)} options={templates.map(t => ({ value: t.value, label: t.label }))} />
                <Group footer="A resposta aparece para todo mundo no Google, com o nome da loja.">
                    <div className="px-4 py-3">
                        <TextArea aria-label="Resposta" rows={6} value={text} onChange={e => setText(e.target.value)} maxLength={4000} />
                    </div>
                </Group>
            </div>
        </Sheet>
    )
}

function LocationPicker({ email, onDone, onDisconnect, extra }: { email: string | null; onDone: () => void; onDisconnect: () => void; extra: React.ReactNode }) {
    const [list, setList] = useState<{ name: string; title: string; address: string | null }[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/google/location')
            .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setList(d.locations) })
            .catch(e => setError((e as Error).message || 'Não foi possível buscar as empresas.'))
    }, [])

    const choose = async (name: string) => {
        setSaving(name)
        const res = await fetch('/api/google/location', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        setSaving(null)
        if (res.ok) onDone()
        else toast.error((await res.json().catch(() => ({}))).error || 'Não foi possível salvar.')
    }

    return (
        <div className="space-y-4">
            <Group title="Qual empresa mostrar?" footer={email ? `Empresas que ${email} administra no Google.` : undefined}>
                {error ? (
                    <p className="px-4 py-6 text-center text-[15px] text-muted-foreground">{error}</p>
                ) : !list ? (
                    <p className="px-4 py-6 text-center"><Loader2 aria-label="Carregando" className="w-5 h-5 animate-spin inline" /></p>
                ) : list.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[15px] text-muted-foreground text-pretty">Esta conta do Google não administra nenhum Perfil da Empresa. Conecte com a conta que é dona ou administradora do perfil da loja.</p>
                ) : list.map(l => (
                    <button key={l.name} type="button" onClick={() => choose(l.name)} disabled={saving !== null} className="w-full text-left px-4 py-3 min-h-[56px] flex items-center gap-3 hover:bg-foreground/[0.02] disabled:opacity-60">
                        <span className="min-w-0 flex-1">
                            <span className="block text-[17px] truncate">{l.title}</span>
                            {l.address && <span className="block text-[13px] text-muted-foreground truncate">{l.address}</span>}
                        </span>
                        {saving === l.name ? <Loader2 aria-hidden className="w-4 h-4 animate-spin" /> : <ExternalLink aria-hidden className="w-4 h-4 text-muted-foreground/60" />}
                    </button>
                ))}
            </Group>
            <div className="flex gap-4 px-1 text-[13px]">
                <a href="/api/google/connect" className="text-primary">Usar outra conta</a>
                <button type="button" onClick={onDisconnect} className="text-red-600 dark:text-red-400">Desconectar</button>
            </div>
            {extra}
        </div>
    )
}
