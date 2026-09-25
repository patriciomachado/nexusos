'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, Search, UserRound } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import PremiumModal from '@/components/ui/PremiumModal'
import CustomerForm from '@/components/forms/CustomerForm'
import { cn } from '@/lib/utils'
import type { Option } from './state'

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Customer row that opens a searchable sheet; a name that doesn't exist yet
 * can be registered right there.
 */
export default function CustomerPicker({ customers, onCustomersChange, value, onChange, companyId, invalid }: {
    customers: Option[]
    onCustomersChange: (list: Option[]) => void
    value: string
    onChange: (id: string) => void
    companyId: string
    invalid?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [creating, setCreating] = useState<string | null>(null)
    const selected = customers.find(c => c.id === value)

    const results = useMemo(() => {
        const q = normalize(query.trim())
        const list = q ? customers.filter(c => normalize(c.name ?? '').includes(q)) : customers
        return list.slice(0, 60)
    }, [customers, query])

    const exact = customers.some(c => normalize(c.name ?? '') === normalize(query.trim()))

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full flex items-center gap-3 px-4 min-h-[60px] text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.04] transition-colors"
            >
                <span className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[15px] font-semibold', selected ? 'bg-primary/10 text-primary' : 'bg-foreground/[0.06] text-muted-foreground')}>
                    {selected ? (selected.name?.charAt(0).toUpperCase() || '?') : <UserRound className="w-[18px] h-[18px]" />}
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-muted-foreground">Cliente</span>
                    <span className={cn('block text-[17px] truncate', selected ? 'text-foreground' : invalid ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground/70')}>
                        {selected ? selected.name : 'Escolher cliente'}
                    </span>
                </span>
                <span className="text-[15px] text-primary font-medium shrink-0">{selected ? 'Trocar' : 'Escolher'}</span>
            </button>

            <Sheet open={open} onClose={() => { setOpen(false); setQuery('') }} title="Cliente" size="md">
                <div className="sticky top-0 bg-card pb-3 z-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            data-autofocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Buscar pelo nome"
                            className="w-full h-11 rounded-xl bg-foreground/[0.06] pl-9 pr-3 text-[17px] outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                </div>
                <ul className="rounded-xl bg-foreground/[0.03] divide-y divide-border/60 overflow-hidden">
                    {query.trim() && !exact && (
                        <li>
                            <button
                                type="button"
                                onClick={() => { setCreating(query.trim()); setOpen(false) }}
                                className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left text-primary"
                            >
                                <Plus className="w-5 h-5 shrink-0" />
                                <span className="text-[17px] truncate">Cadastrar “{query.trim()}”</span>
                            </button>
                        </li>
                    )}
                    {results.map(c => (
                        <li key={c.id}>
                            <button
                                type="button"
                                onClick={() => { onChange(c.id); setOpen(false); setQuery('') }}
                                className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left hover:bg-foreground/[0.03]"
                            >
                                <span className="w-8 h-8 rounded-full bg-foreground/[0.06] text-[14px] font-semibold flex items-center justify-center shrink-0">{c.name?.charAt(0).toUpperCase() || '?'}</span>
                                <span className="flex-1 text-[17px] truncate">{c.name || 'Sem nome'}</span>
                                {c.id === value && <Check className="w-5 h-5 text-primary shrink-0" />}
                            </button>
                        </li>
                    ))}
                    {!results.length && !query.trim() && (
                        <li className="px-4 py-6 text-center text-[15px] text-muted-foreground">Nenhum cliente cadastrado ainda.</li>
                    )}
                </ul>
                {!query.trim() && (
                    <button
                        type="button"
                        onClick={() => { setCreating(''); setOpen(false) }}
                        className="mt-3 w-full h-11 rounded-xl text-[17px] font-medium text-primary hover:bg-primary/10 inline-flex items-center justify-center gap-1.5"
                    >
                        <Plus className="w-5 h-5" /> Novo cliente
                    </button>
                )}
            </Sheet>

            <PremiumModal isOpen={creating !== null} onClose={() => setCreating(null)} title="Novo cliente" maxWidth="lg">
                <div className="p-2">
                    <CustomerForm
                        companyId={companyId}
                        initial={{ name: creating ?? '' }}
                        hideHeader
                        onSuccess={(customer) => {
                            if (customer?.id) {
                                if (!customers.some(c => c.id === customer.id)) onCustomersChange([...customers, { id: customer.id, name: customer.name }])
                                onChange(customer.id)
                            }
                            setCreating(null)
                            setQuery('')
                        }}
                    />
                </div>
            </PremiumModal>
        </>
    )
}
