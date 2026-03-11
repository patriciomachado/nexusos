'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PremiumInput } from './PremiumInput'

interface Props {
    options: string[]
    value: string
    onChange: (value: string) => void
    onAdd?: (value: string) => void
    placeholder?: string
    icon?: React.ReactNode
    className?: string
    required?: boolean
    isAdding?: boolean
}

export default function PremiumAutocomplete({
    options,
    value,
    onChange,
    onAdd,
    placeholder = "Procurar...",
    icon,
    className,
    required,
    isAdding
}: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [filteredOptions, setFilteredOptions] = useState<string[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (value.trim() === '') {
            setFilteredOptions(options.slice(0, 10)) // Show first 10 when empty
            return
        }
        const filtered = options.filter(opt =>
            opt.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10)
        setFilteredOptions(filtered)
    }, [value, options])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const showAddOption = onAdd && value && !options.some(opt => opt.toLowerCase() === value.toLowerCase())

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <PremiumInput
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                    setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                icon={icon || <Search className="w-4 h-4" />}
                required={required}
            />

            {isOpen && (filteredOptions.length > 0 || showAddOption) && (
                <div className="absolute z-[100] mt-2 w-full overflow-hidden rounded-2xl bg-popover/90 border border-border shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200">
                    <ul className="p-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {filteredOptions.map((opt, i) => (
                            <li key={i}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(opt)
                                        setIsOpen(false)
                                    }}
                                    className="relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all text-foreground/70 hover:bg-primary/10 hover:text-primary text-left"
                                >
                                    <span className="truncate">{opt}</span>
                                </button>
                            </li>
                        ))}

                        {showAddOption && (
                            <li className="mt-1 border-t border-border/50 pt-1">
                                <button
                                    type="button"
                                    disabled={isAdding}
                                    onClick={() => {
                                        onAdd(value)
                                        setIsOpen(false)
                                    }}
                                    className="relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all text-primary hover:bg-primary/5 text-left uppercase tracking-widest"
                                >
                                    {isAdding ? (
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    <span className="truncate">Adicionar "{value}"</span>
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}
