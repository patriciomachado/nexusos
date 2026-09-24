'use client'

import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface PremiumModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle?: string
    children: React.ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export default function PremiumModal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    maxWidth = 'md'
}: PremiumModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!mounted || !isOpen) return null

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl'
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center sm:p-4 bg-black/35 animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cn(
                    "bg-card w-full rounded-t-3xl sm:rounded-3xl border border-border/60 shadow-2xl overflow-hidden flex flex-col animate-sheet-up relative max-h-[92vh]",
                    maxWidthClasses[maxWidth]
                )}
            >
                {/* Header */}
                <div className="sm:hidden mx-auto mt-2 w-9 h-1.5 rounded-full bg-foreground/15" aria-hidden />
                <div className="px-6 pt-4 sm:pt-6 pb-2">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h2 className="type-title3 text-foreground">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Fechar"
                            className="w-8 h-8 shrink-0 rounded-full bg-foreground/[0.07] hover:bg-foreground/[0.12] flex items-center justify-center text-muted-foreground transition-colors"
                        >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 pt-3 overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
