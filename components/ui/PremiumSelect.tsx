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
            {label && <label className="block text-[13px] font-medium text-muted-foreground mb-2">{label}</label>}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative h-11 w-full bg-foreground/[0.04] border rounded-xl py-2.5 pl-3.5 pr-10 text-left md:text-[15px] text-base transition-colors",
                    error ? "border-destructive/60" : "border-transparent",
                    isOpen ? "bg-card border-primary ring-4 ring-primary/15" : "hover:bg-foreground/[0.06]"
                )}
            >
                <span className={cn("block truncate", !selectedOption && "text-muted-foreground")}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </span>
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="overflow-hidden rounded-xl material-thick border border-border/70 animate-in fade-in duration-150"
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
                                            "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg md:text-[15px] text-base transition-colors group",
                                            o.id === selectedId
                                                ? "text-primary font-semibold"
                                                : "text-foreground hover:bg-foreground/[0.05]"
                                        )}
                                    >
                                        <span className="flex-1 text-left truncate">{o.name}</span>
                                        {o.id === selectedId && (
                                            <Check className="w-4 h-4 text-primary" />
                                        )}
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-8 text-center">
                                <p className="text-sm text-muted-foreground">Nenhuma opção</p>
                            </li>
                        )}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    )
}
