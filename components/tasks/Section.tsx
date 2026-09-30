import { cn } from '@/lib/utils'

interface SectionProps {
    title?: string
    subtitle?: string
    count?: number
    accent?: 'red' | 'default'
    action?: React.ReactNode
    children: React.ReactNode
    className?: string
    /** Hairline separators between rows, inset past the checkbox (lists-and-tables.md). */
    divided?: boolean
}

/** Inset grouped list, iOS style. */
export default function Section({ title, subtitle, count, accent = 'default', action, children, className, divided = true }: SectionProps) {
    return (
        <section className={cn('space-y-1.5', className)}>
            {(title || action) && (
                <div className="flex items-end justify-between gap-2 px-4 sm:px-1">
                    <div className="min-w-0">
                        {title && (
                            <h2 className={cn('type-headline flex items-center gap-2', accent === 'red' ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                                {title}
                                {typeof count === 'number' && count > 0 && (
                                    <span className="text-[15px] font-normal text-muted-foreground tabular-nums">{count}</span>
                                )}
                            </h2>
                        )}
                        {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            <div className={cn(
                'bg-card sm:rounded-2xl border-y sm:border border-border/60 overflow-visible',
                divided && "[&>*+*]:relative [&>*+*]:before:content-[''] [&>*+*]:before:absolute [&>*+*]:before:top-0 [&>*+*]:before:right-0 [&>*+*]:before:left-[52px] [&>*+*]:before:h-px [&>*+*]:before:bg-border/60"
            )}>
                {children}
            </div>
        </section>
    )
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
    return <p className="px-4 py-4 text-[15px] text-muted-foreground">{children}</p>
}
