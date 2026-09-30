'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Group, SelectRow, brl } from '@/components/ui/form'

interface OpenQuote { id: string; device_model: string; service: string; status: string; options: { tipo: string | null; valor: number }[] }

/**
 * Optional link to a quote (Alice or "Cotar" no dashboard) already sent to
 * this customer, pra contar na estatística de conversão. Ao escolher um
 * orçamento, mostra as opções de preço já cotadas pra já virar item da OS
 * com um toque, em vez de digitar tudo de novo.
 */
export default function QuoteLinkField({ value, onChange, onAddItem }: { value: string | null; onChange: (id: string | null) => void; onAddItem: (name: string, price: number) => void }) {
    const [quotes, setQuotes] = useState<OpenQuote[] | null>(null)
    const [added, setAdded] = useState<number | null>(null)

    useEffect(() => {
        let alive = true
        fetch('/api/parts/quotes')
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (alive) setQuotes(d ? (d.quotes as OpenQuote[]).filter(q => q.status === 'aberto') : []) })
            .catch(() => { if (alive) setQuotes([]) })
        return () => { alive = false }
    }, [])

    if (!quotes?.length) return null
    const selected = quotes.find(q => q.id === value) ?? null
    const options = quotes.map(q => ({
        value: q.id,
        label: `${q.device_model} · ${q.service} · ${brl(Math.min(...q.options.map(o => o.valor)))}`,
    }))

    const pick = (i: number) => {
        if (!selected) return
        const o = selected.options[i]
        onAddItem(`${selected.service}${o.tipo ? ` (${o.tipo})` : ''}`, o.valor)
        setAdded(i)
        toast.success('Item adicionado na OS')
    }

    return (
        <Group title="Veio de um orçamento?" footer="Se o cliente tá confirmando um orçamento já cotado, vincule aqui e toque no valor certo pra já virar item da OS.">
            <SelectRow id="os-quote" label="Orçamento" value={value ?? ''} onChange={v => { onChange(v || null); setAdded(null) }} options={options} placeholder="Nenhum" />
            {selected && (
                <div className="px-4 py-3 flex flex-wrap gap-2">
                    {selected.options.map((o, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => pick(i)}
                            className={cn('h-9 px-3.5 rounded-full text-[14px] font-medium inline-flex items-center gap-1.5 transition-colors', added === i ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/15')}
                        >
                            {added === i && <Check className="w-3.5 h-3.5" />}
                            {o.tipo ?? selected.service}: {brl(o.valor)}
                        </button>
                    ))}
                </div>
            )}
        </Group>
    )
}
