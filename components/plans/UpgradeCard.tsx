import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURE_INFO, PLANS, type Feature } from '@/lib/plans'

/**
 * Shown in place of a Pro feature on the Essencial plan: what it does and a
 * way to upgrade. `compact` fits inside a page section.
 */
export default function UpgradeCard({ feature, compact = false, className }: { feature: Feature; compact?: boolean; className?: string }) {
    const info = FEATURE_INFO[feature]
    const others = PLANS.pro.features.filter(f => f !== feature).slice(0, 3)
    return (
        <section className={cn('rounded-2xl bg-card border border-border/60 text-center', compact ? 'p-5' : 'p-8 sm:p-10 max-w-lg mx-auto', className)}>
            <div className={cn('mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center', compact ? 'w-10 h-10 mb-3' : 'w-14 h-14 mb-4')}>
                <Sparkles className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
            </div>
            <p className="text-[13px] font-semibold text-primary">Plano Pro</p>
            <h2 className={cn('font-semibold tracking-tight mt-1', compact ? 'text-[17px]' : 'text-[22px]')}>{info.title}</h2>
            <p className="text-[15px] text-muted-foreground mt-2 max-w-md mx-auto">{info.description}</p>
            {!compact && (
                <ul className="mt-5 space-y-1.5 text-[14px] text-muted-foreground">
                    {others.map(f => <li key={f}>Também no Pro: <span className="text-foreground">{FEATURE_INFO[f].title}</span></li>)}
                </ul>
            )}
            <Link
                href="/settings/subscription"
                className={cn('inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold', compact ? 'h-9 px-4 text-[14px] mt-4' : 'h-11 px-6 text-[15px] mt-6')}
            >
                Conhecer o Pro · R$ {PLANS.pro.price}/mês
            </Link>
        </section>
    )
}
