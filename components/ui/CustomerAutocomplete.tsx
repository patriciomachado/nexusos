'use client'

import { useState } from 'react'
import { Search, User, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as Popover from '@radix-ui/react-popover'

interface Customer {
    id: string
    name: string
}

interface Props {
    customers: Customer[]
    selectedId: string
    onSelect: (id: string) => void
    onAdd?: (name: string) => void
    error?: boolean
    placeholder?: string
    label?: string
    isAdding?: boolean
}

export default function CustomerAutocomplete({
    customers,
    selectedId,
    onSelect,
    onAdd,
    error,
    placeholder,
    label,
    isAdding
}: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')

    const selectedCustomer = customers.find(c => c.id === selectedId)

    const filteredCustomers = query === ''
        ? customers.slice(0, 10)
        : customers.filter(c =>
            c.name?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10)

    const showAddOption = onAdd && query && !customers.some(c => c.name.toLowerCase() === query.toLowerCase())

    return (
        <div className="relative w-full">
            {label && (
                <label className="block text-[13px] font-medium text-muted-foreground mb-2 px-1">
                    {label}
                </label>
            )}
            
            <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
                <Popover.Trigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "relative h-12 w-full bg-muted/40 border rounded-2xl py-3 pl-4 pr-10 text-left md:text-sm text-base transition-all backdrop-blur-2xl",
                            error ? "border-destructive/50" : "border-border",
                            isOpen ? "ring-2 ring-primary/30 border-primary/50" : "hover:bg-muted/60 hover:border-border/80"
                        )}
                    >
                        <span className="flex items-center gap-3">
                            <User className={cn("w-4 h-4 transition-colors", selectedCustomer ? "text-primary" : "text-muted-foreground")} />
                            <span className={cn("block truncate", !selectedCustomer && "text-muted-foreground")}>
                                {selectedCustomer ? selectedCustomer.name : (placeholder || "Buscar ou selecionar cliente...")}
                            </span>
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </span>
                    </button>
                </Popover.Trigger>

                <Popover.Portal>
                    <Popover.Content 
                        className="z-[9999] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-3xl bg-card/95 border border-white/10 shadow-2xl backdrop-blur-3xl animate-in fade-in duration-200"
                        sideOffset={8}
                        align="start"
                    >
                        <div className="p-3 border-b border-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full h-10 bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 md:text-xs text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                                    placeholder="Procurar cliente..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <ul className="max-h-60 overflow-y-auto p-1.5 scrollbar-hide">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((c) => (
                                    <li key={c.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSelect(c.id)
                                                setIsOpen(false)
                                                setQuery('')
                                            }}
                                            className={cn(
                                                "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl md:text-xs text-base transition-all group",
                                                c.id === selectedId
                                                    ? "bg-primary/10 text-primary font-bold"
                                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black uppercase transition-all shadow-inner",
                                                c.id === selectedId
                                                    ? "bg-primary/20 text-primary border border-primary/30"
                                                    : "bg-white/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary border border-white/5"
                                            )}>
                                                {c.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="flex-1 text-left truncate font-bold">{c.name || 'Sem nome'}</span>
                                            {c.id === selectedId && (
                                                <Check className="w-4 h-4 text-primary" />
                                            )}
                                        </button>
                                    </li>
                                ))
                            ) : !showAddOption && (
                                <li className="px-4 py-8 text-center">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Nenhum cliente encontrado</p>
                                </li>
                            )}

                            {showAddOption && (
                                <li className="mt-1 border-t border-white/5 pt-1">
                                    <button
 type="button"
 disabled={isAdding}
 onClick={() => {
 onAdd!(query)
 setIsOpen(false)
 setQuery('')
 }}
 className="relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-black transition-all text-primary hover:bg-primary/5 text-left "
 >
                                        {isAdding ? (
                                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Plus className="w-3 h-3" />
                                        )}
                                        <span className="truncate">Adicionar "{query}"</span>
                                    </button>
                                </li>
                            )}
                        </ul>
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        </div>
    )
}
