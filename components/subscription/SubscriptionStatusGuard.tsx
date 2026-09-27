'use client'

import { usePathname } from 'next/navigation'
import { AlertCircle, CreditCard } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { FEATURE_INFO, hasFeature, PLANS, routeFeature, type PlanId } from '@/lib/plans'
import { PlanProvider } from '@/components/plans/PlanProvider'
import UpgradeCard from '@/components/plans/UpgradeCard'

interface SubscriptionStatusGuardProps {
    plan: PlanId
    isValid: boolean
    isTrialing: boolean
    daysRemaining: number
    children: React.ReactNode
}

export function SubscriptionStatusGuard({ 
    plan,
    isValid, 
    isTrialing, 
    daysRemaining, 
    children 
}: SubscriptionStatusGuardProps) {
    const pathname = usePathname()

    // Allowed paths even when expired
    const isAllowedPath = 
        pathname === '/settings/subscription' || 
        pathname === '/settings' ||
        (pathname ? pathname.startsWith('/api/') : false) ||
        pathname === '/'

    if (isValid || isAllowedPath) {
        // Pro-only pages on the Essencial plan: explain and offer the upgrade.
        const feature = routeFeature(pathname)
        if (isValid && feature && !hasFeature(plan, feature)) {
            return (
                <div className="min-h-screen bg-background">
                    <Header title={FEATURE_INFO[feature].title} subtitle="Disponível no plano Pro" />
                    <div className="px-4 py-8 sm:py-16"><UpgradeCard feature={feature} /></div>
                </div>
            )
        }
        return <PlanProvider plan={plan}>{children}</PlanProvider>
    }

    return (
        <div className="relative min-h-screen">
            {/* Blurry background of the children to give a premium feel */}
            <div className="opacity-20 pointer-events-none select-none">
                {children}
            </div>

            <div className="fixed inset-0 ios-fill z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div role="alertdialog" aria-modal="true" aria-labelledby="sub-expired-title" className="max-w-md w-full rounded-2xl border border-border/60 bg-card p-6 sm:p-8 text-center space-y-6">
                    <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-destructive">
                        <AlertCircle aria-hidden className="w-9 h-9" />
                    </div>

                    <div className="space-y-2">
                        <h2 id="sub-expired-title" className="type-title2 text-balance">Seu acesso expirou</h2>
                        <p className="text-[15px] text-muted-foreground text-pretty">
                            O teste de 15 dias terminou ou a assinatura está pendente. Ative um plano para continuar.
                        </p>
                    </div>

                    <div className="bg-foreground/[0.04] p-4 rounded-xl flex items-center gap-4 text-left">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                            <CreditCard aria-hidden className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[15px] font-medium">Planos Essencial e Pro</p>
                            <p className="text-[13px] text-muted-foreground">A partir de R$&nbsp;{PLANS.essencial.price} / mês</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Link href="/settings/subscription" className="h-12 px-6 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center hover:opacity-90 transition-opacity">
                            Ativar assinatura
                        </Link>
                        <a href="mailto:suporte@nexusos.com.br" className="h-11 inline-flex items-center justify-center text-[15px] text-primary font-medium rounded-full hover:bg-primary/10 transition-colors">
                            Falar com o suporte
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
