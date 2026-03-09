'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PremiumInput } from './PremiumInput'

interface Props {
    options: string[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    icon?: React.ReactNode
    className?: string
    required?: boolean
}

export default function PremiumAutocomplete({
    options,
    value,
    onChange,
    placeholder = "Procurar...",
    icon,
    className,
    required
}: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [filteredOptions, setFilteredOptions] = useState<string[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (value.trim() === '') {
            setFilteredOptions([])
            return
        }
        const filtered = options.filter(opt =>
            opt.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5)
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

            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl bg-popover border border-border shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
                    <ul className="p-1 py-2">
                        {filteredOptions.map((opt, i) => (
                            <li key={i}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(opt)
                                        setIsOpen(false)
                                    }}
                                    className="relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all text-foreground/60 hover:bg-accent hover:text-accent-foreground text-left"
                                >
                                    <span className="truncate">{opt}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
