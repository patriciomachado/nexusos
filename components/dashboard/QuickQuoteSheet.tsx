'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Search, Trash2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, TextInput, brl, moneyText, parseMoney } from '@/components/ui/form'
import QuotePreview from '@/components/pecas/QuotePreview'

const TIERS = [{ value: 'Genuína', label: 'Genuína' }, { value: 'Premium', label: 'Premium' }, { value: 'Standard', label: 'Standard' }, { value: 'Outra', label: 'Outra' }]

/** Preço sugerido: custo da peça + mão de obra (margem % do custo, ou o mínimo, o que for maior). */
const suggest = (cost: number, margin: number, laborMin: number) => {
    const raw = cost + Math.max(cost * (margin / 100), laborMin)
    return raw > 0 ? Math.ceil(raw / 5) * 5 : 0
}

function guessTier(title: string) {
    const t = title.toLowerCase()
    if (t.includes('original')) return 'Genuína'
    if (t.includes('premium')) return 'Premium'
    if (t.includes('standard') || t.includes('nacional')) return 'Standard'
    return ''
}

interface SearchResult { title: string; url: string; price: number | null }
interface Selected { url: string; title: string; tipo: string; priceText: string }

/**
 * Orçamento rápido: busca ao vivo na NovaPeças, você escolhe quais resultados
 * viram as opções de qualidade (Genuína/Premium/Standard) e já sai a
 * mensagem pronta pra mandar no WhatsApp. Não depende de nada cadastrado.
 */
export default function QuickQuoteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [aparelho, setAparelho] = useState('')
    const [servico, setServico] = useState('Troca de tela')
    const [searching, setSearching] = useState(false)
    const [results, setResults] = useState<SearchResult[] | null>(null)
    const [selected, setSelected] = useState<Selected[]>([])
    const [pricing, setPricing] = useState<{ margin: number; laborMin: number } | null>(null)
    const [generating, setGenerating] = useState(false)
    const [quote, setQuote] = useState<{ message: string } | null>(null)

    useEffect(() => {
        if (!open) return
        setAparelho(''); setServico('Troca de tela'); setResults(null); setSelected([]); setQuote(null)
        fetch('/api/parts/prices').then(r => r.ok ? r.json() : null).then(d => d && setPricing({ margin: d.margin, laborMin: d.laborMin })).catch(() => {})
    }, [open])

    const search = async () => {
        const q = `${aparelho} ${servico}`.trim()
        if (q.length < 2) return toast.error('Preencha o aparelho.')
        setSearching(true); setResults(null)
        try {
            const r = await fetch(`/api/parts/novapecas/search?q=${encodeURIComponent(q)}`)
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'Não foi possível buscar.')
            setResults(d.results)
        } catch (e) { toast.error((e as Error).message) } finally { setSearching(false) }
    }

    const add = (r: SearchResult) => {
        if (r.price == null || selected.some(s => s.url === r.url)) return
        const price = pricing ? suggest(r.price, pricing.margin, pricing.laborMin) : r.price
        setSelected(s => [...s, { url: r.url, title: r.title, tipo: guessTier(r.title), priceText: moneyText(price) }])
    }
    const remove = (url: string) => setSelected(s => s.filter(x => x.url !== url))
    const update = (url: string, patch: Partial<Selected>) => setSelected(s => s.map(x => x.url === url ? { ...x, ...patch } : x))

    const generate = async () => {
        if (!aparelho.trim()) return toast.error('Preencha o aparelho.')
        if (!selected.length) return toast.error('Escolha ao menos uma opção de peça.')
        setGenerating(true)
        try {
            const body = { device_model: aparelho.trim(), service: servico.trim(), options: selected.map(s => ({ tipo: s.tipo || null, valor: parseMoney(s.priceText) })) }
            const r = await fetch('/api/parts/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'Não foi possível gerar o orçamento.')
            setQuote(d)
        } catch (e) { toast.error((e as Error).message) } finally { setGenerating(false) }
    }

    return (
        <Sheet open={open} onClose={onClose} title="Orçamento rápido" size="lg">
            <div className="space-y-5">
                <div tabIndex={-1} data-autofocus />
                <Group>
                    <Field label="Aparelho" htmlFor="qq-model"><TextInput id="qq-model" value={aparelho} onChange={e => setAparelho(e.target.value)} placeholder="Ex.: iPhone 13" /></Field>
                    <Field label="Serviço" htmlFor="qq-service"><TextInput id="qq-service" value={servico} onChange={e => setServico(e.target.value)} placeholder="Ex.: Troca de tela" /></Field>
                    <div className="px-4 py-3">
                        <SecondaryButton onClick={search} disabled={searching} className="w-full h-10 text-[15px]">
                            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar na NovaPeças
                        </SecondaryButton>
                    </div>
                </Group>

                {results && (
                    <Group title="Resultados" footer="Toque em uma opção pra somar ao orçamento.">
                        {results.length === 0 ? <p className="px-4 py-3 text-[13px] text-muted-foreground">Nada encontrado.</p> : (
                            <div className="divide-y divide-border/60">
                                {results.map(r => {
                                    const already = selected.some(s => s.url === r.url)
                                    return (
                                        <button key={r.url} type="button" disabled={r.price == null || already} onClick={() => add(r)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-foreground/[0.03] disabled:opacity-40">
                                            <span className="flex-1 min-w-0 text-[13px] truncate">{r.title}</span>
                                            <span className="text-[14px] font-semibold tabular-nums shrink-0">{r.price != null ? brl(r.price) : 'sem preço'}</span>
                                            {!already && r.price != null && <Plus className="w-4 h-4 text-primary shrink-0" />}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </Group>
                )}

                {selected.length > 0 && (
                    <Group title="Opções do orçamento">
                        <div className="divide-y divide-border/60">
                            {selected.map(s => (
                                <div key={s.url} className="px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex-1 min-w-0 text-[13px] text-muted-foreground truncate">{s.title}</span>
                                        <button type="button" onClick={() => remove(s.url)} aria-label="Remover" className="text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <Chips ariaLabel="Qualidade" value={s.tipo} onChange={v => update(s.url, { tipo: v })} options={TIERS} />
                                    <TextInput inputMode="decimal" value={s.priceText} onChange={e => update(s.url, { priceText: e.target.value })} className="tabular-nums" />
                                </div>
                            ))}
                        </div>
                    </Group>
                )}

                {selected.length > 0 && !quote && (
                    <PrimaryButton onClick={generate} disabled={generating} className="w-full">
                        {generating && <Loader2 className="w-5 h-5 animate-spin" />} Gerar orçamento
                    </PrimaryButton>
                )}

                {quote && <QuotePreview message={quote.message} />}
            </div>
        </Sheet>
    )
}
