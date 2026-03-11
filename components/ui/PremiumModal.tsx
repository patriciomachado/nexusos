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
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className={cn(
                "bg-card w-full rounded-[2.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative",
                maxWidthClasses[maxWidth]
            )}>
                {/* Header */}
                <div className="p-8 pb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all text-muted-foreground/40 hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {subtitle && (
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Content */}
                <div className="p-8 pt-4 overflow-y-auto max-h-[80vh] scrollbar-hide">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
