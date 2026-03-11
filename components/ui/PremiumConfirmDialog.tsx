'use client'

import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
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

    const variantStyles = {
        danger: 'bg-rose-500 shadow-rose-500/20 text-white',
        warning: 'bg-amber-500 shadow-amber-500/20 text-white',
        info: 'bg-primary shadow-primary/20 text-primary-foreground'
    }

    const iconStyles = {
        danger: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        info: 'text-primary bg-primary/10 border-primary/20'
    }

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-sm rounded-[2.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative">
                <div className="p-8 pb-4 flex flex-col items-center text-center">
                    <div className={cn("p-4 rounded-3xl border mb-6", iconStyles[variant])}>
                        <AlertTriangle className="w-8 h-8" />
                    </div>

                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">
                        {title}
                    </h2>

                    <p className="text-xs font-medium text-muted-foreground/60 leading-relaxed px-4">
                        {description}
                    </p>
                </div>

                <div className="p-8 pt-6 grid grid-cols-2 gap-4">
                    <button
                        onClick={onCancel}
                        className="h-14 rounded-2xl bg-muted/30 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-white/5 transition-all active:scale-95"
                    >
                        {cancelLabel}
                    </button>

                    <button
                        onClick={onConfirm}
                        className={cn(
                            "h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95",
                            variantStyles[variant]
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>

                <button
                    onClick={onCancel}
                    className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-xl transition-all text-muted-foreground/40 hover:text-foreground"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>,
        document.body
    )
}
