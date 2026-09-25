import { cn } from '@/lib/utils'
import { statusMeta } from '@/lib/os/status'

export default function OSStatusBadge({ status, className }: { status: string; className?: string }) {
    const m = statusMeta(status)
    return (
        <span className={cn('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[13px] font-medium whitespace-nowrap', m.pill, className)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} aria-hidden />
            {m.label}
        </span>
    )
}
