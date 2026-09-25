'use client'

import { usePathname } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CreditCard, Clock } from 'lucide-react'
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

            {/* Modal Overlay */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-500">
                <Card className="max-w-md w-full p-8 text-center space-y-6 border-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1" />
                    
                    <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-destructive">
                        <AlertCircle className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Período de Acesso Expirado</h2>
                        <p className="text-muted-foreground">
                            Seu período de teste de 15 dias chegou ao fim ou sua assinatura mensal está pendente.
                        </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg flex items-center gap-4 text-left">
                        <div className="bg-primary/10 p-2 rounded-md text-primary">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Planos Essencial e Pro</p>
                            <p className="text-xs text-muted-foreground">A partir de R$ {PLANS.essencial.price} / mês</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <Button asChild size="lg" className="w-full font-semibold transition-all active:scale-100">
                            <Link href="/settings/subscription">
                                Ativar Assinatura Agora
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild className="text-xs text-muted-foreground hover:bg-transparent">
                            <Link href="mailto:suporte@nexusos.com.br">
                                Falar com Suporte
                            </Link>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}
