'use client'

import { PlanCards, PlanTable } from '@/components/plans/PlanCards'

/** Pricing on the landing: both plans start with the free trial. */
export default function LandingPricing() {
    return (
        <div className="space-y-6">
            <PlanCards
                className="max-w-4xl mx-auto"
                action={{ kind: 'link', href: () => '/sign-up', label: () => 'Testar grátis por 15 dias' }}
            />
            <details className="group max-w-4xl mx-auto">
                <summary className="list-none cursor-pointer text-center text-[15px] font-medium text-primary [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">Comparar os planos item a item</span>
                    <span className="hidden group-open:inline">Esconder comparação</span>
                </summary>
                <PlanTable className="mt-4" />
            </details>
        </div>
    )
}
