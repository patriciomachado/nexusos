'use client'

import { forwardRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Building blocks for the service order forms, in the app's grouped-list
 * style: a titled group of rows on a card, one field per row. Inputs use
 * 17px text so iOS never zooms the page on focus.
 */

export function Group({ title, footer, action, children, className }: {
    title?: string
    footer?: React.ReactNode
    action?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <section className={cn('space-y-1.5', className)}>
            {(title || action) && (
                <div className="flex items-end justify-between gap-3 px-4">
                    {title && <h3 className="text-[13px] font-medium text-muted-foreground">{title}</h3>}
                    {action}
                </div>
            )}
            <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                {children}
            </div>
            {footer && <div className="px-4 text-[13px] text-muted-foreground">{footer}</div>}
        </section>
    )
}

/** One field: small label on top, control below. */
export function Field({ label, htmlFor, hint, children, className }: {
    label: string
    htmlFor?: string
    hint?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn('px-4 py-3 min-w-0', className)}>
            <label htmlFor={htmlFor} className="block text-[13px] text-muted-foreground mb-1">{label}</label>
            {children}
            {hint && <p className="text-[12px] text-muted-foreground mt-1">{hint}</p>}
        </div>
    )
}

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...props }, ref) {
    return (
        <input
            ref={ref}
            {...props}
            className={cn('w-full min-w-0 bg-transparent text-[17px] leading-snug text-foreground placeholder:text-muted-foreground/60 outline-none', className)}
        />
    )
})

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, rows = 3, ...props }, ref) {
    return (
        <textarea
            ref={ref}
            rows={rows}
            {...props}
            className={cn('w-full min-w-0 bg-transparent text-[17px] leading-snug text-foreground placeholder:text-muted-foreground/60 outline-none resize-none', className)}
        />
    )
})

/** Native select styled as a row value: on iPhone it opens the system picker. */
export function SelectRow({ label, value, onChange, options, placeholder = 'Selecionar', id }: {
    label: string
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string }[]
    placeholder?: string
    id: string
}) {
    const current = options.find(o => o.value === value)
    return (
        <label htmlFor={id} className="relative flex items-center justify-between gap-3 px-4 min-h-[52px] cursor-pointer">
            <span className="text-[17px] text-foreground shrink-0">{label}</span>
            <span className={cn('flex items-center gap-1 min-w-0 text-[17px]', current ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                <span className="truncate">{current?.label ?? placeholder}</span>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
            </span>
            <select
                id={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer text-[17px]"
            >
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </label>
    )
}

/** Row that opens something (a sheet, another step). */
export function ButtonRow({ label, value, onClick, icon, placeholder, danger }: {
    label: string
    value?: React.ReactNode
    onClick: () => void
    icon?: React.ReactNode
    placeholder?: string
    danger?: boolean
}) {
    return (
        <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.04] transition-colors">
            {icon && <span className="shrink-0">{icon}</span>}
            <span className={cn('text-[17px] shrink-0', danger ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>{label}</span>
            <span className="ml-auto flex items-center gap-1 min-w-0 text-[17px] text-muted-foreground">
                <span className={cn('truncate', !value && 'text-muted-foreground/60')}>{value || placeholder}</span>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
            </span>
        </button>
    )
}

/** iOS switch row. */
export function SwitchRow({ label, description, checked, onChange }: {
    label: string
    description?: React.ReactNode
    checked: boolean
    onChange: (value: boolean) => void
}) {
    return (
        <label className="flex items-center gap-3 px-4 py-3 min-h-[52px] cursor-pointer">
            <span className="flex-1 min-w-0">
                <span className="block text-[17px] text-foreground">{label}</span>
                {description && <span className="block text-[13px] text-muted-foreground mt-0.5">{description}</span>}
            </span>
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span
                aria-hidden
                className="relative w-[51px] h-[31px] shrink-0 rounded-full bg-foreground/[0.12] peer-checked:bg-emerald-500 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[27px] after:h-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-[20px]"
            />
        </label>
    )
}

/** Wrapping pill choices (single select). */
export function Chips<T extends string>({ options, value, onChange, ariaLabel, className }: {
    options: { value: T; label: string }[]
    value: T | '' | null
    onChange: (value: T) => void
    ariaLabel: string
    className?: string
}) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
            {options.map(o => {
                const on = o.value === value
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            'h-9 px-3.5 rounded-full text-[15px] font-medium transition-colors',
                            on ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]'
                        )}
                    >
                        {o.label}
                    </button>
                )
            })}
        </div>
    )
}

export function PrimaryButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            {...props}
            className={cn('h-12 px-6 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity', className)}
        >
            {children}
        </button>
    )
}

export function SecondaryButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            {...props}
            className={cn('h-12 px-5 rounded-full bg-foreground/[0.07] text-foreground text-[17px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-50', className)}
        >
            {children}
        </button>
    )
}

/** Action bar pinned to the bottom of the scroll area, above the iPhone home bar. */
export function BottomBar({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn('sticky bottom-0 z-20 mt-6 material-bar border-t border-border/60', className)}
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
            <div className="max-w-2xl mx-auto px-4 pt-3 flex items-center gap-3">{children}</div>
        </div>
    )
}

export function brl(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** "1.234,56", "1234.56" or "12" → number. */
export function parseMoney(text: string) {
    const t = text.trim()
    if (!t) return 0
    const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
    const n = Number(normalized.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? Math.max(0, n) : 0
}

export function moneyText(value: number) {
    return value ? value.toFixed(2).replace('.', ',') : ''
}
