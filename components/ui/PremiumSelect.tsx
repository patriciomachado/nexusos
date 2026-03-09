'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
    id: string
    name: string
}

interface Props {
    options: Option[]
    selectedId: string
    onSelect: (id: string) => void
    placeholder?: string
    label?: string
    error?: boolean
}

export default function PremiumSelect({ options, selectedId, onSelect, placeholder = "Selecionar...", label, error }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedOption = options.find(o => o.id === selectedId)

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
            {label && <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative h-12 w-full bg-muted/40 border rounded-2xl py-3 pl-4 pr-10 text-left text-sm transition-all backdrop-blur-2xl",
                    error ? "border-destructive/50" : "border-border group-focus-within:border-primary/40",
                    isOpen ? "ring-2 ring-primary/30 border-primary/50" : "hover:bg-muted/60 hover:border-border/80"
                )}
            >
                <span className={cn("block truncate", !selectedOption && "text-muted-foreground/50")}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/30" aria-hidden="true" />
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl bg-card border border-border shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
                    <ul className="max-h-60 overflow-y-auto p-1 py-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                        {options.length > 0 ? (
                            options.map((o) => (
                                <li key={o.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSelect(o.id)
                                            setIsOpen(false)
                                        }}
                                        className={cn(
                                            "relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all group",
                                            o.id === selectedId
                                                ? "bg-primary/10 text-primary font-bold"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <span className="flex-1 text-left truncate">{o.name}</span>
                                        {o.id === selectedId && (
                                            <Check className="w-4 h-4 text-indigo-400" />
                                        )}
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-8 text-center">
                                <p className="text-xs text-muted-foreground/30 uppercase tracking-widest font-black">Nenhuma opção</p>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}
