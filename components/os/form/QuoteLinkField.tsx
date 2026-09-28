'use client'

import { useEffect, useState } from 'react'
import { Group, SelectRow, brl } from '@/components/ui/form'

interface OpenQuote { id: string; device_model: string; service: string; status: string; options: { tipo: string | null; valor: number }[] }

/** Optional link to a quote (Alice or "Cotar" no dashboard) already sent to this customer, pra contar na estatística de conversão. */
export default function QuoteLinkField({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
    const [quotes, setQuotes] = useState<OpenQuote[] | null>(null)

    useEffect(() => {
        let alive = true
        fetch('/api/parts/quotes')
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (alive) setQuotes(d ? (d.quotes as OpenQuote[]).filter(q => q.status === 'aberto') : []) })
            .catch(() => { if (alive) setQuotes([]) })
        return () => { alive = false }
    }, [])

    if (!quotes?.length) return null
    const options = quotes.map(q => ({
        value: q.id,
        label: `${q.device_model} · ${q.service} · ${brl(Math.min(...q.options.map(o => o.valor)))}`,
    }))

    return (
        <Group title="Veio de um orçamento?" footer="Se o cliente tá confirmando um orçamento já cotado, vincule aqui pra contar na estatística de conversão.">
            <SelectRow id="os-quote" label="Orçamento" value={value ?? ''} onChange={v => onChange(v || null)} options={options} placeholder="Nenhum" />
        </Group>
    )
}
