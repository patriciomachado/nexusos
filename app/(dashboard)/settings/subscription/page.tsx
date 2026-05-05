'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Check, Crown, Zap, Calendar, CreditCard, Loader2, AlertCircle, ArrowRight, ShieldCheck, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Subscription {
    id: string
    status: string
    current_period_start: string
    current_period_end: string
    trial_days_remaining: number
    is_trialing: boolean
    stripe_subscription_id?: string
}

const TRIAL_DAYS = 15
const MONTHLY_PRICE = 99
const PLAN_FEATURES = [
    'Gestão completa de Ordens de Serviço',
    'Controle de Estoque Inteligente',
    'PDV / Frente de Caixa Integrado',
    'Relatórios Financeiros Avançados',
    'App do Cliente para Acompanhamento',
    'Acesso Multi-usuário Ilimitado',
    'Suporte Prioritário 24/7',
    'Atualizações e Backups Automáticos'
]

export default function SubscriptionPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(searchParams.get('success') === 'true')

    useEffect(() => {
        fetchSubscription()
    }, [])

    const fetchSubscription = async () => {
        try {
            const res = await fetch('/api/subscriptions')
            const data = await res.json()
            setSubscription(data.subscription)
        } catch (err) {
            console.error('Error fetching subscription:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubscribe = async () => {
        setProcessing(true)
        setError('')

        try {
            const res = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-checkout-session' })
            })

            const data = await res.json()

            if (data.url) {
                window.location.href = data.url
            } else {
                setError(data.error || 'Erro ao criar sessão de pagamento')
            }
        } catch (err) {
            setError('Erro ao processar pagamento')
        } finally {
            setProcessing(false)
        }
    }

    const handlePortal = async () => {
        setProcessing(true)
        
        try {
            const res = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-portal-session' })
            })

            const data = await res.json()

            if (data.url) {
                window.location.href = data.url
            }
        } catch (err) {
            console.error('Error:', err)
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const isTrialing = subscription?.is_trialing
    const daysRemaining = subscription?.trial_days_remaining ?? TRIAL_DAYS
    const isActive = subscription?.status === 'active' || (subscription?.status === 'trialing' && subscription.stripe_subscription_id)
    const isExpired = subscription?.status === 'trial' && daysRemaining <= 0

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <Header title="Potencialize seu Negócio" subtitle="Escolha a melhor solução para sua assistência crescer" />

            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-12">
                {/* Status Banners */}
                <div className="space-y-4">
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="font-black text-emerald-400 uppercase tracking-wider">Pagamento Confirmado!</p>
                                <p className="text-sm text-muted-foreground font-medium">Sua conta Nexus OS agora está em modo profissional.</p>
                            </div>
                        </div>
                    )}

                    {isExpired && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex items-center gap-4 animate-pulse">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <p className="font-black text-red-400 uppercase tracking-wider">Período de Teste Expirado</p>
                                <p className="text-sm text-muted-foreground font-medium">Assine agora para não perder o acesso aos seus dados.</p>
                            </div>
                        </div>
                    )}

                    {isTrialing && !isExpired && (
                        <div className="bg-blue-600/10 border border-blue-600/20 rounded-3xl p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center">
                                <Zap className="w-6 h-6 text-blue-400 animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-blue-400 uppercase tracking-wider">Modo Experimental Ativo</p>
                                <p className="text-sm text-muted-foreground font-medium">
                                    Você tem <span className="text-blue-400 font-bold">{daysRemaining} dias</span> de acesso gratuito total.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pricing Grid */}
                <div className="grid md:grid-cols-5 gap-8 items-start">
                    {/* Features Column */}
                    <div className="md:col-span-3 space-y-8 py-4">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black tracking-tight leading-none uppercase">Nexus OS <span className="text-primary">PRO</span></h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                A solução completa para levar sua assistência técnica ao próximo nível de produtividade e lucro.
                            </p>
                        </div>

                        <div className="grid gap-6">
                            {PLAN_FEATURES.map((feature) => (
                                <div key={feature} className="flex items-center gap-4 group">
                                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Check className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <span className="text-base font-medium opacity-80 group-hover:opacity-100 transition-opacity">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-6 pt-4 border-t border-border">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden flex items-center justify-center">
                                        <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/10" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-bold text-foreground">+1.000</span> empresas já simplificaram sua gestão com Nexus.
                            </p>
                        </div>
                    </div>

                    {/* Pricing Card */}
                    <div className="md:col-span-2 relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-card border border-border rounded-[2rem] overflow-hidden shadow-2xl">
                            {/* Premium Header */}
                            <div className="bg-gradient-to-br from-primary/10 to-transparent p-8 pb-4">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                                        <Crown className="w-6 h-6" />
                                    </div>
                                    <div className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-primary/20">
                                        Recomendado
                                    </div>
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Plano Pro</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-muted-foreground italic">12x de</span>
                                    <span className="text-5xl font-black tracking-tighter">R$ 99</span>
                                    <span className="text-sm font-bold text-muted-foreground uppercase ml-1">/mês</span>
                                </div>
                            </div>

                            <div className="p-8 pt-4 space-y-6">
                                <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-bold">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <span>Período de Teste</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Comece hoje mesmo com 15 dias de acesso total gratuito. Cancele quando quiser.
                                    </p>
                                </div>

                                {isActive ? (
                                    <button
                                        onClick={handlePortal}
                                        disabled={processing}
                                        className="w-full py-5 rounded-2xl bg-muted text-sm font-black uppercase tracking-widest hover:bg-muted/80 transition-all flex items-center justify-center gap-3 border border-border"
                                    >
                                        {processing ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Gerenciar Assinatura <CreditCard className="w-5 h-5" /></>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubscribe}
                                        disabled={processing}
                                        className="w-full py-6 rounded-2xl bg-primary text-primary-foreground text-sm font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/40 relative overflow-hidden group/btn"
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 skew-x-[20deg]" />
                                        {processing ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Garantir 15 Dias Grátis <ArrowRight className="w-5 h-5" /></>
                                        )}
                                    </button>
                                )}

                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        <span>Pagamento processado pelo Stripe</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <Star className="w-4 h-4 text-amber-500" />
                                        <span>Garantia de satisfação de 7 dias</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ / Social Proof / Footer */}
                <div className="text-center space-y-4 pt-12 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground">
                        Dúvidas sobre o plano? <button className="text-primary hover:underline font-bold">Fale com um especialista</button>
                    </p>
                </div>
            </div>
        </div>
)
}