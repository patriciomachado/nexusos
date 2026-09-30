'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Check, ChevronRight, Copy, ExternalLink, FileText, Loader2, Megaphone, Pencil, Plus, QrCode, Search, Share2, ShieldCheck, Smartphone, Trash2, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Segmented from '@/components/ui/Segmented'
import Sheet from '@/components/tasks/Sheet'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, TextArea, TextInput, brl, moneyText, parseMoney } from '@/components/ui/form'
import CustomerPicker from '@/components/os/form/CustomerPicker'
import QRCodePrintModal from '@/components/devices/QRCodePrintModal'
import CatalogSettingsForm from '@/components/devices/CatalogSettingsForm'
import { useFeature } from '@/components/plans/PlanProvider'
import UpgradeCard from '@/components/plans/UpgradeCard'
import { compressToDataUrl } from '@/lib/images/compress'
import type { Device, DeviceTradeIn } from '@/types/devices'
import { cn } from '@/lib/utils'

/**
 * Venda de aparelhos: stock with photos, test checklist and margin; sell
 * with warranty; buy used devices with a guided evaluation; ready-made ad
 * text; and the public catalog.
 */

type Dev = Device & {
    extra_costs?: number | null
    test_checklist?: Record<string, boolean> | null
    warranty_months?: number | null
    sold_at?: string | null
    sold_price?: number | null
    warranty_until?: string | null
}
type Trade = DeviceTradeIn & { photos?: string[]; reference_price?: number | null; suggested_price?: number | null; device_id?: string | null }
type Method = { id: string; name: string; code: string }

const CONDITIONS: { value: Dev['condition']; label: string }[] = [
    { value: 'novo_lacrado', label: 'Novo lacrado' },
    { value: 'seminovo_a', label: 'Seminovo A' },
    { value: 'seminovo_b', label: 'Seminovo B' },
    { value: 'recondicionado', label: 'Recondicionado' },
]
const condLabel = (c?: string) => CONDITIONS.find(x => x.value === c)?.label ?? c ?? ''
const STATUS: Record<string, { label: string; pill: string }> = {
    disponivel: { label: 'Disponível', pill: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' },
    reservado: { label: 'Reservado', pill: 'bg-violet-500/12 text-violet-700 dark:text-violet-300' },
    em_revisao: { label: 'Em revisão', pill: 'bg-orange-500/12 text-orange-700 dark:text-orange-400' },
    vendido: { label: 'Vendido', pill: 'bg-foreground/[0.07] text-muted-foreground' },
}
const TESTS: { key: string; label: string }[] = [
    { key: 'tela', label: 'Tela' }, { key: 'touch', label: 'Touch' }, { key: 'cameras', label: 'Câmeras' },
    { key: 'biometria', label: 'Face ID / digital' }, { key: 'audio', label: 'Som e microfone' }, { key: 'carga', label: 'Carregamento' },
    { key: 'wifi', label: 'Wi‑Fi e Bluetooth' }, { key: 'sinal', label: 'Sinal / chip' }, { key: 'botoes', label: 'Botões' },
]
const ITEMS = ['Carregador', 'Cabo', 'Caixa', 'Capinha', 'Película', 'Nota fiscal']

const num = (v: unknown) => Number(v) || 0
const title = (d: Dev) => [d.brand, d.model, d.storage].filter(Boolean).join(' ')
const cost = (d: Dev) => num(d.cost_price) + num(d.extra_costs)
const margin = (d: Dev, price = num(d.cash_price)) => (price > 0 ? (price - cost(d)) / price : null)
const daysIn = (iso?: string) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : 0)

export default function DevicesClient() {
    const params = useSearchParams()
    const catalogIncluded = useFeature('catalog')
    const [tab, setTab] = useState<'stock' | 'trade' | 'sold' | 'catalog'>(params.get('aba') === 'vendidos' ? 'sold' : 'stock')
    const [devices, setDevices] = useState<Dev[]>([])
    const [trades, setTrades] = useState<Trade[]>([])
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<'ativos' | 'disponivel' | 'reservado' | 'em_revisao'>('ativos')
    const [query, setQuery] = useState('')
    const [editing, setEditing] = useState<Dev | 'new' | null>(null)
    const [viewing, setViewing] = useState<Dev | null>(null)
    const [selling, setSelling] = useState<Dev | null>(null)
    const [ad, setAd] = useState<Dev | null>(null)
    const [qr, setQr] = useState<Dev | null>(null)
    const [evaluating, setEvaluating] = useState<Trade | 'new' | null>(null)
    const [slug, setSlug] = useState('minha-loja')

    const load = useCallback(async () => {
        try {
            const [d, t] = await Promise.all([
                fetch('/api/devices?status=todos').then(r => r.json()),
                fetch('/api/devices/trade-in').then(r => r.json()),
            ])
            setDevices(Array.isArray(d) ? d : [])
            setTrades(Array.isArray(t) ? t : [])
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => {
        load()
        fetch('/api/catalog/me').then(r => r.ok ? r.json() : null).then(i => i?.slug && setSlug(i.slug)).catch(() => {})
    }, [load])

    const q = query.trim().toLowerCase()
    const match = (d: Dev) => !q || `${title(d)} ${d.color ?? ''} ${d.imei_1 ?? ''} ${d.imei_2 ?? ''}`.toLowerCase().includes(q)
    const stock = devices.filter(d => d.status !== 'vendido' && (status === 'ativos' || d.status === status) && match(d))
    const sold = devices.filter(d => d.status === 'vendido' && match(d)).sort((a, b) => String(b.sold_at ?? b.updated_at).localeCompare(String(a.sold_at ?? a.updated_at)))
    const available = devices.filter(d => d.status === 'disponivel')
    const stockValue = available.reduce((s, d) => s + num(d.cash_price), 0)
    const stockCost = available.reduce((s, d) => s + cost(d), 0)
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const soldMonth = sold.filter(d => d.sold_at && new Date(d.sold_at) >= monthStart)
    const profitMonth = soldMonth.reduce((s, d) => s + num(d.sold_price ?? d.cash_price) - cost(d), 0)

    return (
        <div className="min-h-full bg-background">
            <Header title="Aparelhos" />
            <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-4 pb-16 space-y-4">
                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                    <Segmented ariaLabel="Ver" value={tab} onChange={setTab} options={[
                        { value: 'stock', label: 'Estoque', badge: available.length },
                        { value: 'trade', label: 'Comprar usado' },
                        { value: 'sold', label: 'Vendidos' },
                        { value: 'catalog', label: 'Catálogo' },
                    ]} />
                </div>

                {(tab === 'stock' || tab === 'sold') && (
                    <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-foreground/[0.06] focus-within:ring-2 focus-within:ring-primary/40">
                        <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Modelo, cor ou IMEI" className="flex-1 min-w-0 bg-transparent text-[17px] outline-none" />
                    </label>
                )}

                {tab === 'stock' && (
                    <>
                        <div className="grid grid-cols-3 gap-2">
                            <Stat label="Disponíveis" value={String(available.length)} />
                            <Stat label="Valor à venda" value={brl(stockValue)} />
                            <Stat label="Lucro previsto" value={brl(stockValue - stockCost)} />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                            {(['ativos', 'disponivel', 'reservado', 'em_revisao'] as const).map(s => (
                                <button key={s} type="button" onClick={() => setStatus(s)} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium', status === s ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06]')}>
                                    {s === 'ativos' ? 'Todos' : STATUS[s].label}
                                </button>
                            ))}
                        </div>
                        <PrimaryButton className="w-full" onClick={() => setEditing('new')}><Plus className="w-5 h-5" /> Cadastrar aparelho</PrimaryButton>
                        {loading ? <div className="h-48 rounded-2xl bg-card border border-border/60 animate-pulse" /> : stock.length ? (
                            <ul className="grid sm:grid-cols-2 gap-3">
                                {stock.map(d => <li key={d.id}><DeviceCard d={d} onOpen={() => setViewing(d)} /></li>)}
                            </ul>
                        ) : <Empty text="Nenhum aparelho aqui. Cadastre com fotos, IMEI e o checklist de teste." />}
                    </>
                )}

                {tab === 'sold' && (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            <Stat label="Vendidos no mês" value={String(soldMonth.length)} />
                            <Stat label="Lucro no mês" value={brl(profitMonth)} />
                        </div>
                        {sold.length ? (
                            <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                                {sold.map(d => {
                                    const w = d.warranty_until
                                    const active = w && w >= new Date().toISOString().slice(0, 10)
                                    return (
                                        <li key={d.id}>
                                            <button type="button" onClick={() => setViewing(d)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]">
                                                <Thumb d={d} size="sm" />
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-[15px] font-medium truncate">{title(d)}</span>
                                                    <span className="block text-[13px] text-muted-foreground truncate">
                                                        {d.sold_at ? new Date(d.sold_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : ''}
                                                        {w ? ` · garantia ${active ? `até ${new Date(`${w}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}` : 'vencida'}` : ''}
                                                    </span>
                                                </span>
                                                <span className="flex flex-col items-end shrink-0">
                                                    <span className="text-[15px] font-semibold tabular-nums">{brl(num(d.sold_price ?? d.cash_price))}</span>
                                                    <span className="text-[12px] text-emerald-700 dark:text-emerald-400 tabular-nums">+{brl(num(d.sold_price ?? d.cash_price) - cost(d))}</span>
                                                </span>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        ) : <Empty text="Nenhum aparelho vendido ainda." />}
                    </>
                )}

                {tab === 'trade' && (
                    <>
                        <PrimaryButton className="w-full" onClick={() => setEvaluating('new')}><Plus className="w-5 h-5" /> Avaliar aparelho usado</PrimaryButton>
                        <p className="px-1 text-[13px] text-muted-foreground">Checklist guiado com fotos e sugestão de preço. Ao comprar, o aparelho entra no estoque “em revisão”.</p>
                        {trades.length ? (
                            <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                                {trades.map(t => (
                                    <li key={t.id}>
                                        <button type="button" onClick={() => setEvaluating(t)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]">
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[15px] font-medium truncate">{t.device_model}</span>
                                                <span className="block text-[13px] text-muted-foreground truncate">{t.customer_name} · {t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : ''}</span>
                                            </span>
                                            <span className="flex flex-col items-end">
                                                <span className="text-[15px] font-semibold tabular-nums">{brl(num(t.offered_price))}</span>
                                                <span className={cn('text-[12px] font-medium', t.status === 'comprado' ? 'text-emerald-700 dark:text-emerald-400' : t.status === 'recusado' ? 'text-muted-foreground' : 'text-primary')}>{t.status === 'comprado' ? 'Comprado' : t.status === 'recusado' ? 'Recusado' : 'Avaliado'}</span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : <Empty text="Nenhuma avaliação ainda." />}
                    </>
                )}

                {tab === 'catalog' && (!catalogIncluded ? <UpgradeCard feature="catalog" /> : (
                    <div className="space-y-4">
                        <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
                            <p className="text-[15px] text-muted-foreground">Seu catálogo público mostra os aparelhos disponíveis, com fotos e botão de WhatsApp.</p>
                            <div className="flex gap-2">
                                <SecondaryButton className="flex-1" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/loja/${slug}`); toast.success('Link copiado') }}><Copy className="w-4 h-4" /> Copiar link</SecondaryButton>
                                <Link href={`/loja/${slug}`} target="_blank" className="flex-1 h-12 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center gap-1.5">Abrir <ExternalLink className="w-4 h-4" /></Link>
                            </div>
                        </div>
                        <CatalogSettingsForm initialSlug={slug} onSaveSuccess={() => fetch('/api/catalog/me').then(r => r.json()).then(i => i?.slug && setSlug(i.slug)).catch(() => {})} />
                    </div>
                ))}
            </div>

            {viewing && (
                <DeviceDetail
                    d={viewing}
                    onClose={() => setViewing(null)}
                    onEdit={() => { setEditing(viewing); setViewing(null) }}
                    onSell={() => { setSelling(viewing); setViewing(null) }}
                    onAd={() => { setAd(viewing); setViewing(null) }}
                    onQr={() => { setQr(viewing); setViewing(null) }}
                    onChanged={() => { setViewing(null); load() }}
                />
            )}
            {editing && <DeviceForm d={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={load} />}
            {selling && <SellSheet d={selling} onClose={() => setSelling(null)} onDone={() => { setSelling(null); load() }} />}
            {ad && <AdSheet d={ad} slug={slug} onClose={() => setAd(null)} />}
            {evaluating && <TradeInSheet t={evaluating === 'new' ? null : evaluating} onClose={() => setEvaluating(null)} onDone={() => { setEvaluating(null); load() }} />}
            <QRCodePrintModal isOpen={!!qr} onClose={() => setQr(null)} device={qr} />
        </div>
    )
}

/* ─────────────────────────────── Pieces ─────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-card border border-border/60 p-3 min-w-0">
            <p className="text-[12px] text-muted-foreground truncate">{label}</p>
            <p className="text-[15px] font-semibold tabular-nums truncate">{value}</p>
        </div>
    )
}

function Empty({ text }: { text: string }) {
    return <p className="rounded-2xl bg-card border border-border/60 px-4 py-10 text-center text-[15px] text-muted-foreground">{text}</p>
}

function Thumb({ d, size = 'md' }: { d: Dev; size?: 'sm' | 'md' }) {
    const src = Array.isArray(d.images) ? d.images[0] : null
    const cls = size === 'sm' ? 'w-11 h-11 rounded-xl' : 'w-20 h-20 rounded-2xl'
    return src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" className={cn(cls, 'object-cover shrink-0 bg-foreground/[0.05]')} />
        : <span className={cn(cls, 'shrink-0 bg-foreground/[0.06] flex items-center justify-center text-muted-foreground')}><Smartphone className={size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'} /></span>
}

function DeviceCard({ d, onOpen }: { d: Dev; onOpen: () => void }) {
    const m = margin(d)
    const days = daysIn(d.created_at)
    return (
        <button type="button" onClick={onOpen} className="w-full flex gap-3 rounded-2xl bg-card border border-border/60 p-3 text-left hover:bg-foreground/[0.02]">
            <Thumb d={d} />
            <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                    <span className={cn('text-[11px] font-semibold px-1.5 h-5 inline-flex items-center rounded-full', STATUS[d.status]?.pill)}>{STATUS[d.status]?.label}</span>
                    {days >= 30 && <span className="text-[11px] font-semibold px-1.5 h-5 inline-flex items-center rounded-full bg-orange-500/12 text-orange-700 dark:text-orange-400">{days} dias</span>}
                </span>
                <span className="block mt-1 text-[16px] font-medium truncate">{title(d)}</span>
                <span className="block text-[13px] text-muted-foreground truncate">{[d.color, condLabel(d.condition), d.battery_health ? `bateria ${d.battery_health}%` : null].filter(Boolean).join(' · ')}</span>
                <span className="mt-1 flex items-center justify-between">
                    <span className="text-[17px] font-semibold tabular-nums">{brl(num(d.cash_price))}</span>
                    {m != null && <span className={cn('text-[12px] font-medium tabular-nums', m < 0.1 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400')}>margem {Math.round(m * 100)}%</span>}
                </span>
            </span>
        </button>
    )
}

async function save(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Não foi possível salvar.')
    return data
}

/* ─────────────────────────────── Detail ─────────────────────────────── */

function DeviceDetail({ d, onClose, onEdit, onSell, onAd, onQr, onChanged }: { d: Dev; onClose: () => void; onEdit: () => void; onSell: () => void; onAd: () => void; onQr: () => void; onChanged: () => void }) {
    const [busy, setBusy] = useState(false)
    const [confirm, setConfirm] = useState(false)
    const tests = d.test_checklist ?? {}
    const done = TESTS.filter(t => t.key in tests)
    const sold = d.status === 'vendido'
    const setStatus = async (status: string) => {
        setBusy(true)
        try { await save('/api/devices', 'PUT', { id: d.id, status }); toast.success(STATUS[status].label); onChanged() }
        catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
    }
    const remove = async () => {
        setBusy(true)
        try { await save(`/api/devices?id=${d.id}`, 'DELETE'); toast.success('Aparelho removido'); onChanged() }
        catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
    }
    const m = margin(d, sold ? num(d.sold_price) : num(d.cash_price))
    return (
        <Sheet
            open
            onClose={onClose}
            title={title(d)}
            subtitle={[d.color, condLabel(d.condition)].filter(Boolean).join(' · ')}
            full
            footer={sold ? (
                <Link href={`/devices/garantia/${d.id}`} className="w-full h-12 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center gap-2"><FileText className="w-5 h-5" /> Termo de garantia</Link>
            ) : (
                <PrimaryButton className="w-full" onClick={onSell}>Vender por {brl(num(d.cash_price))}</PrimaryButton>
            )}
        >
            <div className="space-y-5">
                <div tabIndex={-1} data-autofocus className="outline-none" aria-hidden />
                {Array.isArray(d.images) && d.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {d.images.map((src, i) => <img key={i} src={src} alt="" className="h-40 w-auto rounded-2xl object-cover shrink-0" />)}
                    </div>
                )}
                <Group>
                    <Row label="Situação" value={STATUS[d.status]?.label ?? d.status} />
                    {sold ? <Row label="Vendido por" value={brl(num(d.sold_price))} /> : <Row label="À vista" value={brl(num(d.cash_price))} />}
                    {!sold && d.installment_price ? <Row label="Parcelado" value={brl(num(d.installment_price))} /> : null}
                    <Row label="Custo" value={`${brl(num(d.cost_price))}${num(d.extra_costs) ? ` + ${brl(num(d.extra_costs))} peças` : ''}`} />
                    {m != null && <Row label={sold ? 'Lucro' : 'Margem'} value={`${brl((sold ? num(d.sold_price) : num(d.cash_price)) - cost(d))} · ${Math.round(m * 100)}%`} />}
                    {d.battery_health ? <Row label="Bateria" value={`${d.battery_health}%`} /> : null}
                    {d.imei_1 && <Row label="IMEI" value={d.imei_1} />}
                    {sold && d.warranty_until && <Row label="Garantia até" value={new Date(`${d.warranty_until}T12:00:00`).toLocaleDateString('pt-BR')} />}
                    {!sold && <Row label="Em estoque há" value={`${daysIn(d.created_at)} dias`} />}
                </Group>
                {done.length > 0 && (
                    <Group title="Teste">
                        <div className="px-4 py-3 flex flex-wrap gap-2">
                            {done.map(t => (
                                <span key={t.key} className={cn('h-8 px-3 rounded-full text-[14px] inline-flex items-center gap-1', tests[t.key] ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/12 text-red-700 dark:text-red-400')}>
                                    {tests[t.key] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {t.label}
                                </span>
                            ))}
                        </div>
                    </Group>
                )}
                <div className="grid grid-cols-4 gap-2">
                    <Action label="Anúncio" onClick={onAd}><Megaphone className="w-5 h-5" /></Action>
                    <Action label="Etiqueta" onClick={onQr}><QrCode className="w-5 h-5" /></Action>
                    <Action label="Editar" onClick={onEdit}><Pencil className="w-5 h-5" /></Action>
                    <Action label="Apagar" onClick={() => setConfirm(true)} danger><Trash2 className="w-5 h-5" /></Action>
                </div>
                {!sold && (
                    <div className="space-y-2">
                        <p className="px-1 text-[13px] text-muted-foreground">Mudar situação</p>
                        <Chips ariaLabel="Situação" options={(['disponivel', 'reservado', 'em_revisao'] as const).map(s => ({ value: s, label: STATUS[s].label }))} value={d.status} onChange={v => !busy && setStatus(v)} />
                    </div>
                )}
                {confirm && (
                    <div className="rounded-2xl bg-red-500/10 p-4 space-y-3">
                        <p className="text-[15px] text-red-700 dark:text-red-400">Apagar {title(d)}? Não dá para desfazer.</p>
                        <div className="flex gap-2">
                            <SecondaryButton className="flex-1" onClick={() => setConfirm(false)}>Cancelar</SecondaryButton>
                            <PrimaryButton className="flex-1 bg-red-600" onClick={remove} disabled={busy}>Apagar</PrimaryButton>
                        </div>
                    </div>
                )}
            </div>
        </Sheet>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 min-h-[46px]">
            <span className="text-[16px] shrink-0">{label}</span>
            <span className="text-[16px] text-muted-foreground text-right truncate tabular-nums">{value}</span>
        </div>
    )
}

function Action({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
            <span className={cn('w-12 h-12 rounded-2xl flex items-center justify-center bg-foreground/[0.06]', danger && 'text-red-600 dark:text-red-400')}>{children}</span>
            <span className="text-[12px] font-medium">{label}</span>
        </button>
    )
}

/* ──────────────────────────────── Form ──────────────────────────────── */

function PhotoStrip({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
    const [busy, setBusy] = useState(false)
    const add = async (files: FileList | null) => {
        if (!files?.length) return
        setBusy(true)
        try {
            const next = [...photos]
            for (const f of Array.from(files).slice(0, 6 - photos.length)) next.push(await compressToDataUrl(f))
            onChange(next)
        } catch { toast.error('Não foi possível ler a foto') } finally { setBusy(false) }
    }
    return (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {photos.map((src, i) => (
                <div key={i} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img width={80} height={80} src={src} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                    <button type="button" onClick={() => onChange(photos.filter((_, k) => k !== i))} aria-label="Remover foto" className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                </div>
            ))}
            {photos.length < 6 && (
                <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer shrink-0">
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    <span className="text-[11px] mt-0.5">Foto</span>
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={e => add(e.target.files)} />
                </label>
            )}
        </div>
    )
}

function TestChecklist({ value, onChange }: { value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void }) {
    const cycle = (k: string) => {
        const next = { ...value }
        if (!(k in next)) next[k] = true
        else if (next[k]) next[k] = false
        else delete next[k]
        onChange(next)
    }
    return (
        <div className="flex flex-wrap gap-2">
            {TESTS.map(t => {
                const v = value[t.key]
                return (
                    <button key={t.key} type="button" onClick={() => cycle(t.key)} className={cn('h-9 px-3 rounded-full text-[15px] inline-flex items-center gap-1', v === true ? 'bg-emerald-600 text-white' : v === false ? 'bg-red-600 text-white' : 'bg-foreground/[0.06]')}>
                        {v === true ? <Check className="w-4 h-4" /> : v === false ? <X className="w-4 h-4" /> : null}{t.label}
                    </button>
                )
            })}
        </div>
    )
}

function DeviceForm({ d, onClose, onDone }: { d: Dev | null; onClose: () => void; onDone: () => void }) {
    const [f, setF] = useState(() => ({
        brand: d?.brand ?? '', model: d?.model ?? '', storage: d?.storage ?? '', color: d?.color ?? '',
        condition: (d?.condition ?? 'seminovo_a') as Dev['condition'], battery: d?.battery_health ? String(d.battery_health) : '',
        imei1: d?.imei_1 ?? '', imei2: d?.imei_2 ?? '', cost: d ? moneyText(num(d.cost_price)) : '', extra: d?.extra_costs ? moneyText(num(d.extra_costs)) : '',
        price: d ? moneyText(num(d.cash_price)) : '', installment: d?.installment_price ? moneyText(num(d.installment_price)) : '',
        items: (d?.included_items ?? []) as string[], photos: (Array.isArray(d?.images) ? d.images : []) as string[],
        tests: (d?.test_checklist ?? {}) as Record<string, boolean>, warranty: String(d?.warranty_months ?? 3), notes: d?.notes ?? '',
    }))
    const [saving, setSaving] = useState(false)
    const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
    const price = parseMoney(f.price)
    const totalCost = parseMoney(f.cost) + parseMoney(f.extra)
    const m = price > 0 ? (price - totalCost) / price : null

    const submit = async () => {
        if (!f.brand.trim() || !f.model.trim()) return toast.error('Informe marca e modelo.')
        if (price <= 0) return toast.error('Informe o preço à vista.')
        setSaving(true)
        try {
            const body = {
                ...(d ? { id: d.id } : {}),
                brand: f.brand.trim(), model: f.model.trim(), storage: f.storage.trim() || null, color: f.color.trim() || null,
                condition: f.condition, battery_health: f.battery ? Number(f.battery) : null,
                imei_1: f.imei1.trim() || null, imei_2: f.imei2.trim() || null,
                cost_price: parseMoney(f.cost), extra_costs: parseMoney(f.extra), cash_price: price,
                installment_price: parseMoney(f.installment) || Math.round(price * 1.12 * 100) / 100,
                included_items: f.items, images: f.photos, test_checklist: f.tests, warranty_months: Number(f.warranty) || 0, notes: f.notes.trim() || null,
            }
            await save('/api/devices', d ? 'PUT' : 'POST', body)
            toast.success(d ? 'Aparelho atualizado' : 'Aparelho cadastrado')
            onDone(); onClose()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }

    return (
        <Sheet open onClose={onClose} title={d ? 'Editar aparelho' : 'Cadastrar aparelho'} full size="lg" footer={<PrimaryButton className="w-full" onClick={submit} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton>}>
            <div className="space-y-5">
                <div className="space-y-2"><p className="px-1 text-[13px] text-muted-foreground">Fotos (até 6)</p><PhotoStrip photos={f.photos} onChange={v => set('photos', v)} /></div>
                <Group>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Marca" htmlFor="dv-brand"><TextInput id="dv-brand" value={f.brand} onChange={e => set('brand', e.target.value)} placeholder="Apple" data-autofocus={!d || undefined} /></Field>
                        <Field label="Modelo" htmlFor="dv-model"><TextInput id="dv-model" value={f.model} onChange={e => set('model', e.target.value)} placeholder="iPhone 13" /></Field>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Armazenamento" htmlFor="dv-sto"><TextInput id="dv-sto" value={f.storage} onChange={e => set('storage', e.target.value)} placeholder="128 GB" /></Field>
                        <Field label="Cor" htmlFor="dv-color"><TextInput id="dv-color" value={f.color} onChange={e => set('color', e.target.value)} placeholder="Azul" /></Field>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Bateria (%)" htmlFor="dv-bat"><TextInput id="dv-bat" inputMode="numeric" value={f.battery} onChange={e => set('battery', e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="89" /></Field>
                        <Field label="Garantia (meses)" htmlFor="dv-war"><TextInput id="dv-war" inputMode="numeric" value={f.warranty} onChange={e => set('warranty', e.target.value.replace(/\D/g, '').slice(0, 2))} /></Field>
                    </div>
                    <Field label="IMEI" htmlFor="dv-imei"><TextInput id="dv-imei" inputMode="numeric" value={f.imei1} onChange={e => set('imei1', e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="15 números (*#06#)" /></Field>
                    <Field label="IMEI 2 (opcional)" htmlFor="dv-imei2"><TextInput id="dv-imei2" inputMode="numeric" value={f.imei2} onChange={e => set('imei2', e.target.value.replace(/\D/g, '').slice(0, 15))} /></Field>
                </Group>
                <div className="space-y-2"><p className="px-1 text-[13px] text-muted-foreground">Estado</p><Chips ariaLabel="Estado" options={CONDITIONS} value={f.condition} onChange={v => set('condition', v)} /></div>
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-muted-foreground">Checklist de teste · toque: ✓ ok, ✗ com defeito, de novo para limpar</p>
                    <TestChecklist value={f.tests} onChange={v => set('tests', v)} />
                </div>
                <Group footer={m != null ? `Margem de ${Math.round(m * 100)}% (${brl(price - totalCost)} de lucro)` : undefined}>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Custo (R$)" htmlFor="dv-cost"><TextInput id="dv-cost" inputMode="decimal" value={f.cost} onChange={e => set('cost', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" /></Field>
                        <Field label="Peças / reparo (R$)" htmlFor="dv-extra"><TextInput id="dv-extra" inputMode="decimal" value={f.extra} onChange={e => set('extra', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" /></Field>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="À vista (R$)" htmlFor="dv-price"><TextInput id="dv-price" inputMode="decimal" value={f.price} onChange={e => set('price', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" /></Field>
                        <Field label="Parcelado (R$)" htmlFor="dv-inst"><TextInput id="dv-inst" inputMode="decimal" value={f.installment} onChange={e => set('installment', e.target.value.replace(/[^\d.,]/g, ''))} placeholder={price ? moneyText(Math.round(price * 112) / 100) : '0,00'} /></Field>
                    </div>
                </Group>
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-muted-foreground">Acompanha</p>
                    <div className="flex flex-wrap gap-2">
                        {ITEMS.map(it => {
                            const on = f.items.includes(it)
                            return <button key={it} type="button" onClick={() => set('items', on ? f.items.filter(x => x !== it) : [...f.items, it])} className={cn('h-9 px-3.5 rounded-full text-[15px]', on ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06]')}>{it}</button>
                        })}
                    </div>
                </div>
                <Group><Field label="Observações" htmlFor="dv-notes"><TextArea id="dv-notes" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Marcas, peças trocadas…" /></Field></Group>
            </div>
        </Sheet>
    )
}

/* ──────────────────────────────── Sell ──────────────────────────────── */

function SellSheet({ d, onClose, onDone }: { d: Dev; onClose: () => void; onDone: () => void }) {
    const [price, setPrice] = useState(moneyText(num(d.cash_price)))
    const [methods, setMethods] = useState<Method[]>([])
    const [methodId, setMethodId] = useState('')
    const [installments, setInstallments] = useState(1)
    const [warranty, setWarranty] = useState(String(d.warranty_months ?? 3))
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
    const [customerId, setCustomerId] = useState('')
    const [companyId, setCompanyId] = useState('')
    const [saving, setSaving] = useState(false)
    useEffect(() => {
        fetch('/api/payment-methods').then(r => r.json()).then((m: Method[]) => {
            if (!Array.isArray(m)) return
            const order = ['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD']
            const rank = (x: Method) => { const i = order.indexOf(x.code); return i < 0 ? 99 : i }
            const sorted = [...m].sort((a, b) => rank(a) - rank(b))
            setMethods(sorted); setMethodId(sorted[0]?.id ?? '')
        }).catch(() => {})
        fetch('/api/customers').then(r => r.json()).then(x => setCustomers(Array.isArray(x.data) ? x.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : [])).catch(() => {})
        fetch('/api/auth/me').then(r => r.json()).then(u => setCompanyId(u?.company_id ?? '')).catch(() => {})
    }, [])
    const credit = (methods.find(m => m.id === methodId)?.code ?? '') === 'CREDIT_CARD'
    const value = parseMoney(price)
    const profit = value - cost(d)
    const submit = async () => {
        setSaving(true)
        try {
            const r = await save(`/api/devices/${d.id}/sell`, 'POST', { price: value, customer_id: customerId || null, payment_method_id: methodId, installments: credit ? installments : 1, warranty_months: Number(warranty) || 0 })
            toast.success(`Vendido${r.warranty_until ? ` · garantia até ${new Date(`${r.warranty_until}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}`)
            onDone()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }
    return (
        <Sheet open onClose={onClose} title={`Vender ${title(d)}`} full footer={<PrimaryButton className="w-full" onClick={submit} disabled={saving || !methodId}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Concluir venda · {brl(value)}</PrimaryButton>}>
            <div className="space-y-5">
                <Group footer={`Lucro: ${brl(profit)}${value > 0 ? ` (${Math.round((profit / value) * 100)}%)` : ''}`}>
                    <Field label="Valor da venda (R$)" htmlFor="sl-price"><TextInput id="sl-price" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.,]/g, ''))} /></Field>
                </Group>
                <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                    <CustomerPicker customers={customers} onCustomersChange={setCustomers} value={customerId} onChange={setCustomerId} companyId={companyId} />
                </div>
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-muted-foreground">Forma de pagamento</p>
                    <Chips ariaLabel="Forma" options={methods.map(m => ({ value: m.id, label: m.name.replace(/^Cartão de /, '') }))} value={methodId} onChange={setMethodId} />
                    {credit && (
                        <select value={installments} onChange={e => setInstallments(Number(e.target.value))} aria-label="Parcelas" className="w-full h-12 rounded-xl bg-foreground/[0.05] px-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                            {Array.from({ length: 12 }, (_, k) => k + 1).map(n => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x de ${brl(value / n)}`}</option>)}
                        </select>
                    )}
                </div>
                <Group footer="O termo de garantia fica pronto para imprimir ou enviar. O app avisa quando a garantia estiver acabando.">
                    <Field label="Garantia (meses)" htmlFor="sl-war"><TextInput id="sl-war" inputMode="numeric" value={warranty} onChange={e => setWarranty(e.target.value.replace(/\D/g, '').slice(0, 2))} /></Field>
                </Group>
            </div>
        </Sheet>
    )
}

/* ───────────────────────────────── Ad ───────────────────────────────── */

function AdSheet({ d, slug, onClose }: { d: Dev; slug: string; onClose: () => void }) {
    const [style, setStyle] = useState<'insta' | 'whats'>('insta')
    const text = useMemo(() => {
        const items = (d.included_items ?? []).join(', ')
        const lines = style === 'insta' ? [
            `📱 ${title(d)}${d.color ? ` · ${d.color}` : ''}`,
            `✨ ${condLabel(d.condition)}${d.battery_health ? ` · 🔋 bateria ${d.battery_health}%` : ''}`,
            (d.test_checklist && Object.values(d.test_checklist).every(Boolean) && Object.keys(d.test_checklist).length) ? '✅ Testado e aprovado (tela, câmeras, som, carga…)' : null,
            items ? `📦 Acompanha: ${items}` : null,
            d.warranty_months ? `🛡️ ${d.warranty_months} meses de garantia` : null,
            '',
            `💰 ${brl(num(d.cash_price))} à vista${d.installment_price ? ` ou ${brl(num(d.installment_price))} no cartão` : ''}`,
            '',
            '📲 Chama no direct ou no WhatsApp!',
            '#celular #seminovo #iphone #android #assistenciatecnica',
        ] : [
            `*${title(d)}*${d.color ? ` (${d.color})` : ''}`,
            `${condLabel(d.condition)}${d.battery_health ? ` · bateria ${d.battery_health}%` : ''}`,
            items ? `Acompanha: ${items}` : null,
            d.warranty_months ? `Garantia de ${d.warranty_months} meses` : null,
            `*${brl(num(d.cash_price))}* à vista${d.installment_price ? ` · ${brl(num(d.installment_price))} no cartão` : ''}`,
            typeof window !== 'undefined' ? `Veja mais: ${window.location.origin}/loja/${slug}` : null,
        ]
        return lines.filter(l => l !== null).join('\n')
    }, [d, style, slug])

    const share = async () => {
        const nav = navigator as Navigator & { share?: (x: { text: string; files?: File[] }) => Promise<void>; canShare?: (x: { files: File[] }) => boolean }
        try {
            const files: File[] = []
            for (const [i, src] of (d.images ?? []).slice(0, 4).entries()) {
                const blob = await fetch(src).then(r => r.blob())
                files.push(new File([blob], `aparelho-${i + 1}.jpg`, { type: blob.type || 'image/jpeg' }))
            }
            if (nav.share && files.length && nav.canShare?.({ files })) await nav.share({ text, files })
            else if (nav.share) await nav.share({ text })
            else { await navigator.clipboard.writeText(text); toast.success('Texto copiado') }
        } catch { /* cancelled */ }
    }

    return (
        <Sheet open onClose={onClose} title="Anúncio pronto" footer={<><SecondaryButton onClick={() => { navigator.clipboard.writeText(text); toast.success('Texto copiado') }}><Copy className="w-5 h-5" /></SecondaryButton><PrimaryButton className="flex-1" onClick={share}><Share2 className="w-5 h-5" /> Compartilhar com fotos</PrimaryButton></>}>
            <div className="space-y-4">
                <Segmented ariaLabel="Para" value={style} onChange={setStyle} options={[{ value: 'insta', label: 'Instagram' }, { value: 'whats', label: 'WhatsApp' }]} />
                <pre className="whitespace-pre-wrap rounded-2xl bg-foreground/[0.04] p-4 text-[15px] leading-relaxed font-sans">{text}</pre>
            </div>
        </Sheet>
    )
}

/* ────────────────────────────── Trade-in ────────────────────────────── */

const HOUSING: { value: string; label: string; cut: number }[] = [
    { value: 'impecavel', label: 'Impecável', cut: 0 },
    { value: 'bom', label: 'Bom', cut: 0.05 },
    { value: 'marcas_leves', label: 'Marcas leves', cut: 0.1 },
    { value: 'danificado', label: 'Danificado', cut: 0.25 },
]
const TRADE_TESTS: { key: string; label: string; cut: number }[] = [
    { key: 'screen_ok', label: 'Tela', cut: 0.2 }, { key: 'touch_ok', label: 'Touch', cut: 0.15 }, { key: 'cameras_ok', label: 'Câmeras', cut: 0.1 },
    { key: 'face_id_ok', label: 'Face ID / digital', cut: 0.1 }, { key: 'audio_mic_ok', label: 'Som e microfone', cut: 0.05 }, { key: 'charging_port_ok', label: 'Carregamento', cut: 0.05 },
]

function TradeInSheet({ t, onClose, onDone }: { t: Trade | null; onClose: () => void; onDone: () => void }) {
    const c = (t?.assessment_checklist ?? {}) as Record<string, unknown>
    const [name, setName] = useState(t?.customer_name ?? '')
    const [phone, setPhone] = useState(t?.customer_phone ?? '')
    const [cpf, setCpf] = useState(t?.customer_cpf ?? '')
    const [model, setModel] = useState(t?.device_model ?? '')
    const [imei, setImei] = useState(t?.imei ?? '')
    const [photos, setPhotos] = useState<string[]>(t?.photos ?? [])
    const [tests, setTests] = useState<Record<string, boolean>>(() => Object.fromEntries(TRADE_TESTS.map(x => [x.key, c[x.key] !== false])))
    const [battery, setBattery] = useState(c.battery_health ? String(c.battery_health) : '')
    const [housing, setHousing] = useState(String(c.housing_condition ?? 'bom'))
    const [reference, setReference] = useState(t?.reference_price ? moneyText(num(t.reference_price)) : '')
    const [storeMargin, setStoreMargin] = useState('30')
    const [offer, setOffer] = useState(t ? moneyText(num(t.offered_price)) : '')
    const [notes, setNotes] = useState(t?.notes ?? '')
    const [busy, setBusy] = useState<string | null>(null)
    const readOnly = t?.status === 'comprado'

    const suggestion = useMemo(() => {
        const ref = parseMoney(reference)
        if (!ref) return null
        const cuts: { label: string; pct: number }[] = []
        for (const x of TRADE_TESTS) if (!tests[x.key]) cuts.push({ label: `${x.label} com defeito`, pct: x.cut })
        const b = Number(battery)
        if (b && b < 80) cuts.push({ label: `Bateria ${b}%`, pct: 0.1 })
        const h = HOUSING.find(x => x.value === housing)
        if (h && h.cut) cuts.push({ label: `Carcaça: ${h.label.toLowerCase()}`, pct: h.cut })
        const worth = ref * Math.max(0, 1 - cuts.reduce((s, x) => s + x.pct, 0))
        const m = Math.min(Math.max(Number(storeMargin) || 0, 0), 80) / 100
        return { cuts, worth, offer: Math.floor((worth * (1 - m)) / 10) * 10 }
    }, [reference, tests, battery, housing, storeMargin])

    const payload = () => ({
        customer_name: name.trim(), customer_phone: phone.trim() || null, customer_cpf: cpf.trim() || null,
        device_model: model.trim(), imei: imei.trim() || null, photos,
        assessment_checklist: { ...tests, battery_health: Number(battery) || undefined, housing_condition: housing },
        reference_price: parseMoney(reference) || null, suggested_price: suggestion?.offer ?? null,
        offered_price: parseMoney(offer) || suggestion?.offer || 0, notes: notes.trim() || null,
    })
    const valid = () => {
        if (!name.trim() || !model.trim()) { toast.error('Informe o cliente e o aparelho.'); return false }
        if (!(parseMoney(offer) || suggestion?.offer)) { toast.error('Informe o valor da oferta.'); return false }
        return true
    }
    const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
        setBusy(key)
        try { await fn(); toast.success(ok); onDone() } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
    }
    const saveNew = () => valid() && run('save', () => save('/api/devices/trade-in', 'POST', payload()), 'Avaliação salva')
    const buy = () => valid() && run('buy', async () => {
        let id = t?.id
        if (!id) id = (await save('/api/devices/trade-in', 'POST', payload())).id
        await save(`/api/devices/trade-in/${id}/buy`, 'POST', { price: parseMoney(offer) || suggestion?.offer, from: 'cash' })
    }, 'Comprado · entrou no estoque em revisão')
    const decline = () => t && run('decline', () => save(`/api/devices/trade-in/${t.id}/buy`, 'PATCH', { status: 'recusado' }), 'Oferta recusada')

    return (
        <Sheet
            open
            onClose={onClose}
            title={t ? t.device_model : 'Avaliar aparelho usado'}
            full
            size="lg"
            footer={readOnly ? undefined : (
                <div className="w-full space-y-2">
                    <PrimaryButton className="w-full" onClick={buy} disabled={!!busy}>{busy === 'buy' && <Loader2 className="w-5 h-5 animate-spin" />}Comprar por {brl(parseMoney(offer) || suggestion?.offer || 0)}</PrimaryButton>
                    <div className="flex gap-2">
                        {!t && <SecondaryButton className="flex-1" onClick={saveNew} disabled={!!busy}>Só salvar avaliação</SecondaryButton>}
                        {t && t.status !== 'recusado' && <SecondaryButton className="flex-1" onClick={decline} disabled={!!busy}>Cliente recusou</SecondaryButton>}
                    </div>
                </div>
            )}
        >
            <div className="space-y-5">
                {readOnly && <p className="rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-3 text-[15px] inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Comprado por {brl(num(t?.offered_price))}. Está no estoque.</p>}
                <Group title="Cliente">
                    <Field label="Nome" htmlFor="ti-name"><TextInput id="ti-name" value={name} onChange={e => setName(e.target.value)} data-autofocus={!t || undefined} /></Field>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="WhatsApp" htmlFor="ti-phone"><TextInput id="ti-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
                        <Field label="CPF" htmlFor="ti-cpf"><TextInput id="ti-cpf" inputMode="numeric" value={cpf} onChange={e => setCpf(e.target.value)} /></Field>
                    </div>
                </Group>
                <Group title="Aparelho">
                    <Field label="Modelo" htmlFor="ti-model"><TextInput id="ti-model" value={model} onChange={e => setModel(e.target.value)} placeholder="Apple iPhone 12 128 GB" /></Field>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="IMEI" htmlFor="ti-imei"><TextInput id="ti-imei" inputMode="numeric" value={imei} onChange={e => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))} /></Field>
                        <Field label="Bateria (%)" htmlFor="ti-bat"><TextInput id="ti-bat" inputMode="numeric" value={battery} onChange={e => setBattery(e.target.value.replace(/\D/g, '').slice(0, 3))} /></Field>
                    </div>
                </Group>
                <div className="space-y-2"><p className="px-1 text-[13px] text-muted-foreground">Fotos do aparelho</p><PhotoStrip photos={photos} onChange={setPhotos} /></div>
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-muted-foreground">Teste · toque no que estiver com defeito</p>
                    <div className="flex flex-wrap gap-2">
                        {TRADE_TESTS.map(x => (
                            <button key={x.key} type="button" onClick={() => setTests(v => ({ ...v, [x.key]: !v[x.key] }))} className={cn('h-9 px-3 rounded-full text-[15px] inline-flex items-center gap-1', tests[x.key] ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
                                {tests[x.key] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{x.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2"><p className="px-1 text-[13px] text-muted-foreground">Carcaça</p><Chips ariaLabel="Carcaça" options={HOUSING.map(h => ({ value: h.value, label: h.label }))} value={housing} onChange={setHousing} /></div>
                <Group title="Preço" footer="Referência: quanto você venderia um igual em bom estado. A sugestão desconta os defeitos e a sua margem.">
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Referência (R$)" htmlFor="ti-ref"><TextInput id="ti-ref" inputMode="decimal" value={reference} onChange={e => setReference(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" /></Field>
                        <Field label="Sua margem (%)" htmlFor="ti-margin"><TextInput id="ti-margin" inputMode="numeric" value={storeMargin} onChange={e => setStoreMargin(e.target.value.replace(/\D/g, '').slice(0, 2))} /></Field>
                    </div>
                </Group>
                {suggestion && (
                    <div className="rounded-2xl bg-primary/8 border border-primary/20 p-4 space-y-1">
                        <p className="text-[13px] text-muted-foreground">Sugestão de oferta</p>
                        <p className="text-[28px] font-semibold tabular-nums">{brl(suggestion.offer)}</p>
                        <p className="text-[13px] text-muted-foreground">Vale ~{brl(suggestion.worth)}{suggestion.cuts.length ? ` (${suggestion.cuts.map(x => `${x.label} −${Math.round(x.pct * 100)}%`).join(', ')})` : ''}</p>
                        {!readOnly && <button type="button" onClick={() => setOffer(moneyText(suggestion.offer))} className="text-[15px] text-primary font-medium">Usar este valor</button>}
                    </div>
                )}
                <Group>
                    <Field label="Oferta final (R$)" htmlFor="ti-offer"><TextInput id="ti-offer" inputMode="decimal" value={offer} onChange={e => setOffer(e.target.value.replace(/[^\d.,]/g, ''))} placeholder={suggestion ? moneyText(suggestion.offer) : '0,00'} /></Field>
                    <Field label="Observações" htmlFor="ti-notes"><TextArea id="ti-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
                </Group>
                {!readOnly && <p className="px-1 text-[13px] text-muted-foreground">Ao comprar, o valor sai do seu caixa aberto e o aparelho entra no estoque “em revisão” com esse custo.</p>}
                {t?.status === 'comprado' && t.device_id && <p className="px-1 text-[15px]"><ChevronRight className="w-4 h-4 inline" /> Veja no Estoque.</p>}
            </div>
        </Sheet>
    )
}
