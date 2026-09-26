'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronRight, Loader2, Plus, Search } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { cn } from '@/lib/utils'

export interface PickerOption { id: string; name: string; detail?: string }

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Row (inside a Group) that opens a searchable sheet to pick one option.
 * With onCreate, a name that isn't in the list can be registered right there.
 */
export default function OptionPicker({ label, title, options, value, onChange, placeholder = 'Escolher', searchPlaceholder = 'Buscar', emptyText = 'Nada cadastrado ainda.', optional, onCreate, invalid }: {
    label: string
    title?: string
    options: PickerOption[]
    value: string
    onChange: (id: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    /** Shows a "Nenhum" row that clears the choice. */
    optional?: boolean
    /** Registers a new option and returns its id. */
    onCreate?: (name: string) => Promise<string | null | undefined>
    invalid?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [creating, setCreating] = useState(false)
    const selected = options.find(o => o.id === value)

    const results = useMemo(() => {
        const q = normalize(query.trim())
        const list = q ? options.filter(o => normalize(`${o.name} ${o.detail ?? ''}`).includes(q)) : options
        return list.slice(0, 80)
    }, [options, query])
    const exact = options.some(o => normalize(o.name) === normalize(query.trim()))

    const close = () => { setOpen(false); setQuery('') }
    const pick = (id: string) => { onChange(id); close() }

    const create = async () => {
        if (!onCreate) return
        setCreating(true)
        try {
            const id = await onCreate(query.trim())
            if (id) pick(id)
        } finally {
            setCreating(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.04] transition-colors"
            >
                <span className="text-[17px] text-foreground shrink-0">{label}</span>
                <span className={cn('ml-auto flex items-center gap-1 min-w-0 text-[17px]', selected ? 'text-muted-foreground' : invalid ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground/60')}>
                    <span className="truncate">{selected?.name ?? placeholder}</span>
                    <ChevronRight aria-hidden className="w-4 h-4 shrink-0 opacity-60" />
                </span>
            </button>

            <Sheet open={open} onClose={close} title={title ?? label} full>
                <div className="sticky top-0 bg-card pb-3 z-10">
                    <div className="relative">
                        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="search"
                            data-autofocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            aria-label={searchPlaceholder}
                            autoComplete="off"
                            className="w-full h-11 rounded-xl bg-foreground/[0.06] pl-9 pr-3 text-[17px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        />
                    </div>
                </div>
                <ul className="rounded-xl bg-foreground/[0.03] divide-y divide-border/60 overflow-hidden">
                    {optional && !query.trim() && (
                        <li>
                            <button type="button" onClick={() => pick('')} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left hover:bg-foreground/[0.03]">
                                <span className="flex-1 text-[17px] text-muted-foreground">Nenhum</span>
                                {!value && <Check aria-hidden className="w-5 h-5 text-primary shrink-0" />}
                            </button>
                        </li>
                    )}
                    {results.map(o => (
                        <li key={o.id}>
                            <button type="button" onClick={() => pick(o.id)} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left hover:bg-foreground/[0.03]">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[17px] truncate">{o.name || 'Sem nome'}</span>
                                    {o.detail && <span className="block text-[13px] text-muted-foreground truncate">{o.detail}</span>}
                                </span>
                                {o.id === value && <Check aria-hidden className="w-5 h-5 text-primary shrink-0" />}
                            </button>
                        </li>
                    ))}
                    {onCreate && query.trim() && !exact && (
                        <li>
                            <button type="button" onClick={create} disabled={creating} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left text-primary disabled:opacity-60">
                                {creating ? <Loader2 aria-hidden className="w-5 h-5 shrink-0 animate-spin" /> : <Plus aria-hidden className="w-5 h-5 shrink-0" />}
                                <span className="text-[17px] truncate">Cadastrar “{query.trim()}”</span>
                            </button>
                        </li>
                    )}
                    {!results.length && !(onCreate && query.trim()) && (
                        <li className="px-4 py-6 text-center text-[15px] text-muted-foreground">{query.trim() ? 'Nada encontrado.' : emptyText}</li>
                    )}
                </ul>
            </Sheet>
        </>
    )
}
