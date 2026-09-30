'use client'

import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
    value: T
    onChange: (value: T) => void
    options: { value: T; label: string; badge?: number }[]
    className?: string
    size?: 'sm' | 'md'
    ariaLabel?: string
}

/** iOS-style segmented control (segmented-controls.md). */
export default function Segmented<T extends string>({ value, onChange, options, className, size = 'md', ariaLabel }: SegmentedProps<T>) {
    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={cn('inline-flex p-0.5 rounded-[10px] bg-foreground/[0.06] gap-0.5 max-w-full overflow-x-auto scrollbar-hide', className)}
        >
            {options.map(opt => {
                const selected = opt.value === value
                return (
                    <button
                        key={opt.value}
                        role="tab"
                        type="button"
                        aria-selected={selected}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'relative shrink-0 rounded-[8px] font-medium transition-[background-color,color,box-shadow] whitespace-nowrap flex items-center justify-center gap-1.5',
                            size === 'sm' ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3.5 text-[14px]',
                            selected ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {opt.label}
                        {!!opt.badge && (
                            <span className={cn('min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold flex items-center justify-center tabular-nums', selected ? 'bg-primary text-primary-foreground' : 'bg-foreground/10 text-foreground/80')}>
                                {opt.badge > 99 ? '99+' : opt.badge}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
