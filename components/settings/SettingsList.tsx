import Link from 'next/link'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * iPhone Settings-style rows: a colored icon tile, a label, an optional
 * value on the right and a chevron. Used by the settings hub and its pages.
 */
export function SettingsRow({ href, icon: Icon, color, label, detail, value }: {
    href: string
    icon: LucideIcon
    /** Tailwind background for the icon tile, e.g. "bg-blue-500". */
    color: string
    label: string
    detail?: string
    value?: string
}) {
    return (
        <Link href={href} className="flex items-center gap-3 pl-3 pr-3 min-h-[52px] py-2 hover:bg-foreground/[0.02] active:bg-foreground/[0.05] transition-colors">
            <span className={cn('w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-white shrink-0', color)}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[17px] text-foreground truncate">{label}</span>
                {detail && <span className="block text-[13px] text-muted-foreground truncate">{detail}</span>}
            </span>
            {value && <span className="text-[15px] text-muted-foreground truncate max-w-[40%]">{value}</span>}
            <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
        </Link>
    )
}

export function SettingsSection({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="space-y-1.5">
            {title && <h3 className="px-4 text-[13px] font-medium text-muted-foreground">{title}</h3>}
            <div className="rounded-2xl bg-card border border-border/60 overflow-hidden divide-y divide-border/60 [&>*]:border-border/60">{children}</div>
            {footer && <p className="px-4 text-[13px] text-muted-foreground">{footer}</p>}
        </section>
    )
}

/** "‹ Ajustes" link shown at the top of each settings page. */
export function BackToSettings() {
    return (
        <Link href="/settings" className="inline-flex items-center text-[17px] text-primary -ml-1.5">
            <ChevronLeft className="w-5 h-5" /> Configurações
        </Link>
    )
}
