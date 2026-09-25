'use client'

import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { usePlan } from '@/components/plans/PlanProvider'
import { PLANS } from '@/lib/plans'


/** Summary of the plan in Settings; details and changes live on /settings/subscription. */
export default function SubscriptionSettings(_props: { company?: unknown }) {
    const plan = PLANS[usePlan()]
    return (
        <Link href="/settings/subscription" className="flex items-center gap-4 rounded-2xl bg-card border border-border/60 p-5 hover:bg-foreground/[0.02] transition-colors">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[17px] font-semibold">Plano {plan.name}</p>
                <p className="text-[14px] text-muted-foreground">
                    {plan.maxUsers ? `Até ${plan.maxUsers} usuários` : 'Usuários sem limite'} · R$ {plan.price}/mês · ver planos e pagamento
                </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </Link>
    )
}
