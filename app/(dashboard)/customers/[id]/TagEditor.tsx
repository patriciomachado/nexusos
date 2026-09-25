'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

const SUGGESTED = ['VIP', 'Revendedor', 'Empresa', 'Indicação', 'Atenção']

/** Customer tags (etiquetas): used as segments in the list and for campaigns. */
export default function TagEditor({ customerId, initial }: { customerId: string; initial: string[] }) {
    const [tags, setTags] = useState(initial)
    const [adding, setAdding] = useState(false)
    const [text, setText] = useState('')

    const save = async (next: string[]) => {
        const prev = tags
        setTags(next)
        const res = await fetch(`/api/customers/${customerId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: next }) })
        if (!res.ok) { setTags(prev); toast.error('Não foi possível salvar a etiqueta') }
    }
    const add = (t: string) => {
        const v = t.trim().replace(/^#/, '').slice(0, 30)
        if (!v || tags.includes(v)) return
        save([...tags, v]); setText(''); setAdding(false)
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {tags.map(t => (
                <span key={t} className="h-7 pl-2.5 pr-1 rounded-full bg-primary/10 text-primary text-[13px] font-medium inline-flex items-center gap-1">
                    #{t}
                    <button type="button" onClick={() => save(tags.filter(x => x !== t))} aria-label={`Tirar ${t}`} className="w-5 h-5 rounded-full hover:bg-primary/15 flex items-center justify-center"><X className="w-3 h-3" /></button>
                </span>
            ))}
            {adding ? (
                <span className="inline-flex items-center gap-1">
                    <input
                        autoFocus
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') add(text); if (e.key === 'Escape') setAdding(false) }}
                        onBlur={() => text ? add(text) : setAdding(false)}
                        placeholder="etiqueta"
                        className="h-7 w-28 rounded-full bg-foreground/[0.06] px-2.5 text-[13px] outline-none"
                    />
                    {SUGGESTED.filter(s => !tags.includes(s)).slice(0, 3).map(s => (
                        <button key={s} type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(s)} className="h-7 px-2.5 rounded-full bg-foreground/[0.06] text-[13px]">#{s}</button>
                    ))}
                </span>
            ) : (
                <button type="button" onClick={() => setAdding(true)} className="h-7 px-2.5 rounded-full bg-foreground/[0.06] text-[13px] inline-flex items-center gap-1 text-muted-foreground"><Plus className="w-3 h-3" /> etiqueta</button>
            )}
        </div>
    )
}
