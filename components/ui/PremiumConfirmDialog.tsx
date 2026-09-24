'use client'

import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface PremiumConfirmDialogProps {
    isOpen: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel: () => void
    variant?: 'danger' | 'warning' | 'info'
}

export default function PremiumConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
    variant = 'danger'
}: PremiumConfirmDialogProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !isOpen) return null

    // Destructive actions use red text, never a filled button (alerts.md › Buttons).
    const variantStyles = {
        danger: 'text-red-500',
        warning: 'text-orange-600',
        info: 'text-primary'
    }

    const iconStyles = {
        danger: 'text-red-500 bg-red-500/12',
        warning: 'text-orange-600 bg-orange-500/12',
        info: 'text-primary bg-primary/12'
    }

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-black/35 animate-in fade-in duration-200">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="material-thick w-full max-w-[300px] rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            >
                <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center">
                    <div className={cn("w-11 h-11 rounded-full flex items-center justify-center mb-3", iconStyles[variant])}>
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h2 id="confirm-title" className="type-headline text-foreground">
                        {title}
                    </h2>
                    <p className="text-[13px] text-muted-foreground leading-snug mt-1">
                        {description}
                    </p>
                </div>

                <div className="grid grid-cols-2 border-t border-border/70">
                    <button
                        onClick={onCancel}
                        autoFocus
                        className="h-11 text-[17px] text-primary hover:bg-foreground/[0.04] active:bg-foreground/[0.08] transition-colors border-r border-border/70"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={cn(
                            "h-11 text-[17px] font-semibold hover:bg-foreground/[0.04] active:bg-foreground/[0.08] transition-colors",
                            variantStyles[variant]
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
