'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

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
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

    const selectedOption = options.find(o => o.id === selectedId)

    // Position the dropdown relative to the button
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
            })
        }
    }, [isOpen])

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return

        function handlePointerDown(event: PointerEvent) {
            const target = event.target as Node
            if (
                buttonRef.current?.contains(target) ||
                dropdownRef.current?.contains(target)
            ) {
                return
            }
            setIsOpen(false)
        }

        // Use a small delay so the opening click doesn't immediately close
        const timer = setTimeout(() => {
            document.addEventListener('pointerdown', handlePointerDown)
        }, 0)

        return () => {
            clearTimeout(timer)
            document.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [isOpen])

    // Close on Escape

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    return (
        <div className="relative w-full">
            {label && <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">{label}</label>}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative h-12 w-full bg-muted/40 border rounded-2xl py-3 pl-4 pr-10 text-left md:text-sm text-base transition-all backdrop-blur-2xl",
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

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="overflow-hidden rounded-2xl bg-card border border-border shadow-2xl backdrop-blur-2xl animate-in fade-in duration-200"
                >
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
                                            "relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl md:text-sm text-base transition-all group",
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
                </div>,
                document.body
            )}
        </div>
    )
}
