'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Hammer, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Technician {
    id: string
    name: string
}

interface Props {
    technicians: Technician[]
    selectedId: string
    onSelect: (id: string) => void
    error?: boolean
    placeholder?: string
    label?: string
}

export default function TechnicianAutocomplete({ technicians, selectedId, onSelect, error, placeholder, label }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedTechnician = technicians.find(t => t.id === selectedId)

    const filteredTechnicians = query === ''
        ? technicians.slice(0, 10)
        : technicians.filter(t =>
            t.name.toLowerCase().includes(query.toLowerCase())
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
            {label && (
                <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em] px-1">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative h-12 w-full bg-muted/40 border rounded-2xl py-3 pl-4 pr-10 text-left text-sm transition-all backdrop-blur-2xl",
                    error ? "border-destructive/50" : "border-border",
                    isOpen ? "ring-2 ring-primary/30 border-primary/50" : "hover:bg-muted/60 hover:border-border/80"
                )}
            >
                <div className="flex items-center gap-3">
                    <Hammer className={cn("w-4 h-4 transition-colors", selectedTechnician ? "text-primary" : "text-muted-foreground/30")} />
                    <span className={cn("block truncate", !selectedTechnician && "text-muted-foreground/50")}>
                        {selectedTechnician ? selectedTechnician.name : (placeholder || "Selecionar técnico...")}
                    </span>
                </div>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/30" aria-hidden="true" />
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[2rem] bg-card/95 border border-white/10 shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full h-10 bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                                placeholder="Procurar técnico..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <ul className="max-h-60 overflow-y-auto p-1.5 scrollbar-hide">
                        {filteredTechnicians.length > 0 ? (
                            filteredTechnicians.map((t) => (
                                <li key={t.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSelect(t.id)
                                            setIsOpen(false)
                                            setQuery('')
                                        }}
                                        className={cn(
                                            "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs transition-all group",
                                            t.id === selectedId
                                                ? "bg-primary/10 text-primary font-bold"
                                                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black uppercase transition-all",
                                            t.id === selectedId
                                                ? "bg-primary/20 text-primary"
                                                : "bg-white/5 text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            {t.name.charAt(0)}
                                        </div>
                                        <span className="flex-1 text-left truncate font-bold">{t.name}</span>
                                        {t.id === selectedId && (
                                            <Check className="w-4 h-4 text-primary" />
                                        )}
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-8 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20">Nenhum técnico encontrado</p>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}
