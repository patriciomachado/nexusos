'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import Money from '@/components/reports/Money'

/**
 * "Esconder valores" for the dashboard, like a banking app: money shows as
 * •••• until tapped again. Remembered on this device.
 */

const KEY = 'nexus_hide_values'
const PrivacyContext = createContext<{ hidden: boolean; toggle: () => void }>({ hidden: false, toggle: () => {} })

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const [hidden, setHidden] = useState(false)

    useEffect(() => {
        try {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (localStorage.getItem(KEY) === '1') setHidden(true)
        } catch { /* private mode */ }
    }, [])

    const toggle = useCallback(() => {
        setHidden(h => {
            try { localStorage.setItem(KEY, h ? '0' : '1') } catch { /* ignore */ }
            return !h
        })
    }, [])

    return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>
}

export function usePrivacy() {
    return useContext(PrivacyContext)
}

export function PrivacyToggle({ className }: { className?: string }) {
    const { hidden, toggle } = usePrivacy()
    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={hidden}
            aria-label={hidden ? 'Mostrar valores' : 'Esconder valores'}
            className={cn('w-10 h-10 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1] flex items-center justify-center text-foreground transition-colors', className)}
        >
            {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
    )
}

/** A money value that respects "esconder valores". */
export function Amount({ value, className, plain = false }: { value: number; className?: string; plain?: boolean }) {
    const { hidden } = usePrivacy()
    if (hidden) return <span className={cn('tracking-wider', className)} aria-label="Valor oculto">R$ ••••</span>
    if (plain) return <span className={cn('tabular-nums', className)}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    return <Money value={value} className={cn('tabular-nums', className)} />
}

/** Hides a block that is all about money (e.g. a chart) behind a blur. */
export function PrivateBlock({ children, label = 'Valores ocultos' }: { children: React.ReactNode; label?: string }) {
    const { hidden, toggle } = usePrivacy()
    return (
        <div className="relative">
            <div className={cn('transition-[filter]', hidden && 'blur-md pointer-events-none select-none')} aria-hidden={hidden || undefined}>{children}</div>
            {hidden && (
                <button type="button" onClick={toggle} className="absolute inset-0 flex items-center justify-center gap-2 text-[15px] font-medium text-foreground">
                    <EyeOff className="w-5 h-5" /> {label} · tocar para mostrar
                </button>
            )}
        </div>
    )
}
