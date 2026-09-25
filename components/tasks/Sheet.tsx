'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
    open: boolean
    onClose: () => void
    title: string
    subtitle?: string
    children: React.ReactNode
    footer?: React.ReactNode
    size?: 'md' | 'lg'
    /**
     * Phones: take the whole screen from the top (search pickers). The search
     * field and the first results stay near the top, visible above the
     * keyboard, instead of hanging from the bottom edge.
     */
    full?: boolean
}

/**
 * Bottom sheet on phones, centered panel on larger screens (sheets.md).
 * Dismisses with Esc, the close button, or tapping the dimmed background.
 */
export default function Sheet({ open, onClose, title, subtitle, children, footer, size = 'md', full = false }: SheetProps) {
    const [mounted, setMounted] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    // Latest onClose without re-running the effects below: callers often pass
    // an inline function, which changes on every keystroke inside the sheet.
    const onCloseRef = useRef(onClose)
    useEffect(() => { onCloseRef.current = onClose })

    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
        document.addEventListener('keydown', onKey)
        // Move focus into the sheet once, when it opens: the field marked
        // data-autofocus, else the first field (never the close button, which
        // would close the phone keyboard).
        const t = setTimeout(() => {
            const panel = panelRef.current
            const el = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>('input, textarea, select')
            if (el && !panel?.contains(document.activeElement)) el.focus()
        }, 50)
        return () => {
            document.body.style.overflow = prev
            document.removeEventListener('keydown', onKey)
            clearTimeout(t)
        }
    }, [open])

    if (!mounted || !open) return null

    return createPortal(
        <div
            className={cn(
                'fixed inset-0 ios-fill z-[1000] flex sm:items-center justify-center sm:p-6 bg-black/35 animate-in fade-in duration-200',
                full ? 'items-stretch pt-[calc(env(safe-area-inset-top)+10px)]' : 'items-end'
            )}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cn(
                    'w-full bg-card rounded-t-[22px] sm:rounded-[22px] shadow-2xl flex flex-col animate-sheet-up border border-border/50',
                    full ? 'h-full sm:h-auto sm:max-h-[85dvh]' : 'max-h-[92dvh]',
                    size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
                )}
            >
                <div className="sm:hidden mx-auto mt-2 w-9 h-[5px] rounded-full bg-foreground/15" aria-hidden />
                <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3">
                    <div className="min-w-0">
                        <h2 className="type-headline text-foreground truncate">{title}</h2>
                        {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="w-8 h-8 shrink-0 rounded-full bg-foreground/[0.07] hover:bg-foreground/[0.12] flex items-center justify-center text-muted-foreground transition-colors"
                    >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
                    {children}
                </div>
                {footer && (
                    <div
                        className="px-5 pt-3 border-t border-border/60 flex items-center gap-2"
                        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
