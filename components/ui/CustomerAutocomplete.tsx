'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, User, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Customer {
    id: string
    name: string
}

interface Props {
    customers: Customer[]
    selectedId: string
    onSelect: (id: string) => void
    error?: boolean
    placeholder?: string
}

export default function CustomerAutocomplete({ customers, selectedId, onSelect, error, placeholder }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedCustomer = customers.find(c => c.id === selectedId)

    const filteredCustomers = query === ''
        ? customers.slice(0, 10)
        : customers.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative h-12 w-full bg-muted/40 border rounded-xl py-3 pl-4 pr-10 text-left text-sm transition-all backdrop-blur-2xl",
                    error ? "border-destructive/50" : "border-border group-focus-within:border-primary/40",
                    isOpen ? "ring-2 ring-primary/30 border-primary/50" : "hover:bg-muted/60 hover:border-border/80"
                )}
            >
                <div className="flex items-center gap-3">
                    <User className={cn("w-4 h-4 transition-colors", selectedCustomer ? "text-primary" : "text-muted-foreground/30")} />
                    <span className={cn("block truncate", !selectedCustomer && "text-muted-foreground/50")}>
                        {selectedCustomer ? selectedCustomer.name : (placeholder || "Buscar ou selecionar cliente...")}
                    </span>
                </div>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/30" aria-hidden="true" />
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl bg-card border border-border shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-border/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full h-12 bg-muted/40 border border-border rounded-xl pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all backdrop-blur-2xl hover:bg-muted/60 hover:border-border/80"
                                placeholder="Nome, e-mail ou CPF..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <ul className="max-h-60 overflow-y-auto p-1 py-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
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
                                            "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all group",
                                            c.id === selectedId
                                                ? "bg-primary/10 text-primary font-bold"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase transition-all shadow-inner",
                                            c.id === selectedId
                                                ? "bg-primary/20 text-primary border border-primary/30"
                                                : "bg-muted/50 text-muted-foreground/50 group-hover:bg-primary/10 group-hover:text-primary border border-border/50"
                                        )}>
                                            {c.name.charAt(0)}
                                        </div>
                                        <span className="flex-1 text-left truncate">{c.name}</span>
                                        {c.id === selectedId && (
                                            <Check className="w-4 h-4 text-primary" />
                                        )}
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-8 text-center">
                                <p className="text-xs text-muted-foreground/30 uppercase tracking-widest font-black">Nenhum cliente encontrado</p>
                            </li>
                        )}
                    </ul>

                    <div className="p-2 border-t border-border/50 bg-muted/20">
                        <Link
                            href="/customers/new"
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
                            onClick={() => setIsOpen(false)}
                        >
                            + Cadastrar Novo Cliente
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
