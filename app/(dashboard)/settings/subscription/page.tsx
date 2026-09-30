'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock, CreditCard, Loader2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import { PlanCards, PlanTable } from '@/components/plans/PlanCards'
import { PLANS, isPlanId, type PlanId } from '@/lib/plans'
import { cn } from '@/lib/utils'

interface Subscription {
    status: string
    plan?: string
    effective_plan?: PlanId
    current_period_start: string
    current_period_end: string
    trial_days_remaining: number
    is_trialing: boolean
    stripe_customer_id: string | null
}

function formatDate(value: string | null | undefined) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function SubscriptionContent() {
    const searchParams = useSearchParams()
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<PlanId | 'portal' | null>(null)
    const [error, setError] = useState('')
    const success = searchParams?.get('success') === 'true'

    useEffect(() => {
        fetch('/api/subscriptions', { cache: 'no-store' })
            .then(r => r.json())
            .then(d => setSubscription(d.subscription ?? null))
            .catch(() => setError('Não foi possível carregar sua assinatura.'))
            .finally(() => setLoading(false))
    }, [])

    const post = async (body: Record<string, string>) => {
        setError('')
        try {
            const res = await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
                return
            }
            setError(data.error || 'Não foi possível abrir o pagamento.')
        } catch {
            setError('Não foi possível abrir o pagamento.')
        }
        setBusy(null)
    }

    const subscribe = (plan: PlanId) => {
        setBusy(plan)
        post({ action: 'create-checkout-session', plan })
    }

    const portal = () => {
        setBusy('portal')
        post({ action: 'create-portal-session' })
    }

    if (loading) {
        return <div className="py-32 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    }

    const trialing = subscription?.status === 'trial'
    const active = subscription?.status === 'active'
    const days = subscription?.trial_days_remaining ?? 0
    const expired = !active && (!trialing || days <= 0)
    const currentPlan: PlanId | null = active ? (isPlanId(subscription?.plan) ? subscription.plan : 'pro') : null

    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16 max-w-5xl mx-auto space-y-6">
            {success && (
                <p role="status" className="rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-4 py-3 text-[15px] flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" /> Pagamento recebido. Seu plano é ativado assim que a confirmação chegar.
                </p>
            )}
            {error && (
                <p role="alert" className="rounded-2xl bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 text-[15px] flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                </p>
            )}

            {/* Where the account stands */}
            <section className="rounded-3xl bg-card border border-border/60 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                    active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : expired ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-primary/10 text-primary')}>
                    {active ? <CheckCircle2 className="w-6 h-6" /> : expired ? <AlertCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                    {active ? (
                        <>
                            <p className="text-[17px] font-semibold">Plano {PLANS[currentPlan!].name} ativo</p>
                            <p className="text-[14px] text-muted-foreground">Próxima renovação em {formatDate(subscription?.current_period_end)}</p>
                        </>
                    ) : expired ? (
                        <>
                            <p className="text-[17px] font-semibold">Seu acesso terminou</p>
                            <p className="text-[14px] text-muted-foreground">Escolha um plano para continuar usando o Nexus OS. Seus dados estão guardados.</p>
                        </>
                    ) : (
                        <>
                            <p className="text-[17px] font-semibold">Teste grátis: {days} {days === 1 ? 'dia restante' : 'dias restantes'}</p>
                            <p className="text-[14px] text-muted-foreground">Durante o teste você usa tudo do plano Pro. Termina em {formatDate(subscription?.current_period_end)}.</p>
                        </>
                    )}
                </div>
                {active && subscription?.stripe_customer_id && (
                    <button type="button" onClick={portal} disabled={!!busy} className="h-10 px-4 rounded-full bg-foreground/[0.07] text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">
                        {busy === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Gerenciar pagamento
                    </button>
                )}
            </section>

            <PlanCards
                current={currentPlan}
                action={{
                    kind: 'button',
                    onChoose: subscribe,
                    busy: busy === 'portal' ? null : busy,
                    disabled: plan => plan === currentPlan,
                    label: plan => plan === currentPlan ? 'Plano atual' : currentPlan ? `Mudar para o ${PLANS[plan].name}` : `Assinar o ${PLANS[plan].name}`,
                }}
            />

            <div className="space-y-3">
                <h2 className="text-[20px] font-semibold tracking-tight">Compare os planos</h2>
                <PlanTable />
            </div>

            <p className="text-center text-[14px] text-muted-foreground">
                Pagamento mensal por Pix ou cartão, sem fidelidade. Dúvidas? <a href="mailto:suporte@nexusos.com.br" className="text-primary font-medium">Fale com a gente</a>
            </p>
        </div>
    )
}

export default function SubscriptionPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header title="Plano" subtitle="Sua assinatura do Nexus OS" />
            <Suspense>
                <SubscriptionContent />
            </Suspense>
        </div>
    )
}
