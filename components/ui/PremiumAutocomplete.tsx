'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PremiumInput } from './PremiumInput'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

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
    autoComplete?: string
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
    isAdding,
    autoComplete = "off"
}: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [filteredOptions, setFilteredOptions] = useState<string[]>([])
    const containerRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

    useEffect(() => {
        if (value.trim() === '') {
            setFilteredOptions(options.slice(0, 10))
            return
        }
        const filtered = options.filter(opt =>
            opt.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10)
        setFilteredOptions(filtered)
    }, [value, options])

    const showAddOption = !!onAdd
    const shouldShow = isOpen && (filteredOptions.length > 0 || showAddOption)

    // Position dropdown
    useEffect(() => {
        if (shouldShow && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
            })
        }
    }, [shouldShow])

    // Close on outside click
    useEffect(() => {
        if (!shouldShow) return
        function handlePointerDown(event: PointerEvent) {
            const target = event.target as Node
            if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
            setIsOpen(false)
        }
        const timer = setTimeout(() => document.addEventListener('pointerdown', handlePointerDown), 0)
        return () => { clearTimeout(timer); document.removeEventListener('pointerdown', handlePointerDown) }
    }, [shouldShow])

    // Close on Escape
    useEffect(() => {
        if (!shouldShow) return
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
        document.addEventListener('keydown', h)
        return () => document.removeEventListener('keydown', h)
    }, [shouldShow])

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <PremiumInput
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                    if (!isOpen) setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                icon={icon || <Search className="w-4 h-4" />}
                required={required}
                autoComplete={autoComplete}
            />

            {shouldShow && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="overflow-hidden rounded-2xl bg-card/95 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200"
                >
                    <ul className="p-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {filteredOptions.map((opt, i) => (
                            <li key={i}>
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
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

                        {onAdd && (
                            <li className="mt-1 border-t border-border/50 pt-1 sticky bottom-0 bg-card/95">
                                <button
                                    type="button"
                                    disabled={isAdding}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        if (value.trim()) {
                                            onAdd(value)
                                            setIsOpen(false)
                                        } else {
                                            toast.error('Digite um nome para a categoria')
                                        }
                                    }}
                                    className="relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all text-primary hover:bg-primary/5 text-left uppercase tracking-widest"
                                >
                                    {isAdding ? (
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    <span className="truncate">
                                        {value ? `Adicionar "${value}"` : 'Adicionar Nova'}
                                    </span>
                                </button>
                            </li>
                        )}

                    </ul>
                </div>,
                document.body
            )}
        </div>
    )
}
