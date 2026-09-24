import { cn } from '@/lib/utils'

/**
 * Standard page title for every module (same pattern as Dashboard and
 * Tarefas): optional context line, large title, one-line description and the
 * page's actions on the right (below on phones).
 */
interface PageHeaderProps {
    title: React.ReactNode
    subtitle?: React.ReactNode
    /** Short context above the title, e.g. "Controle de oficina". */
    eyebrow?: React.ReactNode
    actions?: React.ReactNode
    className?: string
}

export default function PageHeader({ title, subtitle, eyebrow, actions, className }: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-4', className)}>
            <div className="min-w-0 space-y-1">
                {eyebrow && <p className="text-[13px] font-medium text-muted-foreground">{eyebrow}</p>}
                <h1 className="type-large-title text-foreground">{title}</h1>
                {subtitle && <p className="text-[15px] text-muted-foreground max-w-2xl">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
    )
}

/** Filled action (one per screen): "Novo cliente", "Nova OS"… */
export const primaryActionClass =
    'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold hover:opacity-90 active:scale-[0.98] transition-[opacity,transform] shrink-0'

/** Tinted secondary action. */
export const secondaryActionClass =
    'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-primary/12 text-primary text-[15px] font-semibold hover:bg-primary/18 active:scale-[0.98] transition-[background-color,transform] shrink-0'
