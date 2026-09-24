'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import { 
    Check, Crown, Zap, Calendar, CreditCard, Loader2, AlertCircle, 
    ArrowRight, ShieldCheck, Star, Clock, Flame, Sparkles, Lock,
    CheckCircle2, XCircle, Activity, TrendingUp
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface Subscription {
    id: string
    status: string
    plan: string
    current_period_start: string
    current_period_end: string
    trial_started_at: string | null
    trial_days_remaining: number
    is_trialing: boolean
    stripe_subscription_id: string | null
    stripe_customer_id: string | null
    created_at: string
}

const TRIAL_DAYS = 15
const MONTHLY_PRICE = "54,90"

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

const STATUS_CONFIG = {
    trial: {
        label: 'Teste-Grátis',
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        icon: Flame,
        description: 'Período de teste ativo'
    },
    active: {
        label: 'Pro Assinante',
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        icon: Crown,
        description: 'Assinatura profissional ativa'
    },
    cancelled: {
        label: 'Cancelado',
        bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        icon: XCircle,
        description: 'Assinatura cancelada'
    },
    expired: {
        label: 'Expirado',
        bg: 'bg-red-500/10 border-red-500/20 text-red-400',
        icon: AlertCircle,
        description: 'Período de acesso encerrado'
    }
}

function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getDaysRemaining(endDate: string) {
    if (!endDate) return 0
    const now = new Date()
    const end = new Date(endDate)
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function SubscriptionPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(searchParams?.get('success') === 'true')

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

    const isTrialing = subscription?.status === 'trial'
    const daysRemaining = subscription?.trial_days_remaining ?? TRIAL_DAYS
    const isActive = (subscription?.status === 'active' || subscription?.status === 'trialing') && !!subscription?.stripe_subscription_id
    const isExpired = subscription?.status === 'trial' && daysRemaining <= 0
    const statusConfig = STATUS_CONFIG[subscription?.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.trial
    const StatusIcon = statusConfig.icon

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <Header title="Plano & Licenciamento" subtitle="Gerenciamento de cotas e infraestrutura" />

            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
                {/* Error Banner */}
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-6 h-6 text-rose-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-rose-400 uppercase tracking-wider">Erro na Operação</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                        <button onClick={() => setError('')} className="text-muted-foreground hover:text-foreground">
                            <Check className="w-5 h-5 rotate-45" />
                        </button>
                    </div>
                )}

                {/* Status Banner */}
                {success && (
                    <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-3xl p-6 md:p-8 flex items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xl font-black tracking-tight uppercase gradient-text">Pagamento Confirmado!</p>
                            <p className="text-sm text-muted-foreground mt-1">Sua conta Nexus OS agora está em modo profissional.</p>
                        </div>
                    </div>
                )}

                {/* Main Status Card - Beautiful & Informative */}
                <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-blue-600 rounded-3xl blur opacity-30"></div>
                    <div className="relative bg-gradient-to-br from-card via-card/80 to-primary/5 border border-white/10 rounded-3xl overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,255,0.3),transparent_50%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.3),transparent_50%)]" />
                        </div>
                        
                        <div className="relative p-6 md:p-10">
                            {/* Header Row */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", isActive ? "bg-amber-500/20" : "bg-blue-500/20")}>
                                        {isActive ? (
                                            <Crown className="w-8 h-8 text-amber-400" />
                                        ) : (
                                            <Flame className="w-8 h-8 text-blue-400 animate-pulse" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-1">Status da Conta</p>
                                        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold", statusConfig.bg)}>
                                            <StatusIcon className="w-4 h-4" />
                                            {statusConfig.label}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Days Remaining Badge */}
                                <div className={cn(
                                    "flex items-center gap-3 px-5 py-3 rounded-2xl border",
                                    isActive ? "bg-emerald-500/10 border-emerald-500/20" : isExpired ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20"
                                )}>
                                    {isActive ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    ) : isExpired ? (
                                        <AlertCircle className="w-5 h-5 text-red-400" />
                                    ) : (
                                        <Clock className="w-5 h-5 text-blue-400" />
                                    )}
                                    <div>
                                        <p className="text-xs opacity-60 font-medium">Dias Restantes</p>
                                        <p className={cn("text-2xl font-black tracking-tighter", isActive ? "text-emerald-400" : isExpired ? "text-red-400" : "text-blue-400")}>
                                            {daysRemaining}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {/* Plan Info */}
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-purple-400" />
                                        <p className="text-xs font-black uppercase tracking-widest opacity-50">Plano Atual</p>
                                    </div>
                                    <p className="text-xl font-black">{isActive ? 'Nexus OS Pro' : 'Teste-Grátis'}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{isActive ? 'Assinatura mensal ativa' : `${TRIAL_DAYS} dias de acesso total`}</p>
                                </div>

                                {/* Start Date */}
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="w-4 h-4 text-blue-400" />
                                        <p className="text-xs font-black uppercase tracking-widest opacity-50">Início do Período</p>
                                    </div>
                                    <p className="text-xl font-black">{formatDate(subscription?.current_period_start || '')}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{isTrialing ? 'Início do teste-grátis' : 'Renovação automática'}</p>
                                </div>

                                {/* End Date */}
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Activity className="w-4 h-4 text-rose-400" />
                                        <p className="text-xs font-black uppercase tracking-widest opacity-50">Próximo Vencimento</p>
                                    </div>
                                    <p className="text-xl font-black">{formatDate(subscription?.current_period_end || '')}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{isActive ? 'Renovação automática' : 'Expira automaticamente'}</p>
                                </div>
                            </div>

                            {/* Action Button */}
                            {isActive ? (
                                <button
 onClick={handlePortal}
 disabled={processing}
 className="w-full py-4 rounded-2xl bg-white/5 text-sm font-black hover:bg-white/10 transition-all flex items-center justify-center gap-3 border border-white/10"
 >
                                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <><CreditCard className="w-5 h-5" /> Gerenciar Assinatura Cakto</>
                                    )}
                                </button>
                            ) : (
                                <button
 onClick={handleSubscribe}
 disabled={processing}
 className="w-full py-6 rounded-2xl bg-gradient-to-r from-primary via-purple-600 to-blue-600 text-white text-base font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(120,119,255,0.4)] relative overflow-hidden group/btn border border-white/20"
 >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 skew-x-[20deg]" />
                                    {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                        <><Zap className="w-6 h-6 fill-current" /> Finalizar Compra - Ativar Pro <ArrowRight className="w-6 h-6" /></>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                {isActive && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {PLAN_FEATURES.slice(0, 4).map((feature) => (
                            <div key={feature} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                </div>
                                <span className="text-sm font-medium opacity-80">{feature}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Trial Info for non-active */}
                {!isActive && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-5 gap-8 items-start">
                            {/* Features */}
                            <div className="md:col-span-3 space-y-6">
                                <div className="space-y-3">
                                    <h2 className="text-2xl font-black tracking-tight leading-none ">
                                        Nexus OS <span className="text-primary">PRO</span>
                                    </h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        A solução completa para levar sua assistência técnica ao próximo nível de produtividade e lucro.
                                    </p>
                                </div>

                                <div className="grid gap-4">
                                    {PLAN_FEATURES.map((feature) => (
                                        <div key={feature} className="flex items-center gap-3 group">
                                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                <Check className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <span className="text-sm font-medium opacity-80">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pricing Card */}
                            <div className="md:col-span-2">
                                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
                                    <div className="bg-gradient-to-br from-primary/10 to-transparent p-8">
                                        <div className="flex items-baseline gap-1 mb-2">
                                            <span className="text-5xl font-black tracking-tighter">R$ {MONTHLY_PRICE}</span>
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground uppercase">mensal</p>
                                    </div>
                                    <div className="p-6 pt-2 space-y-4">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                            <span>Sem necessidade de cartão de crédito</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <Star className="w-4 h-4 text-amber-500" />
                                            <span>Pagamento facilitado via PIX</span>
                                        </div>
                                        
                                        <button
 onClick={handleSubscribe}
 disabled={processing}
 className="w-full py-4 mt-2 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
 >
                                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                <>Assinar Agora <ArrowRight className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Help */}
                <div className="text-center pt-8 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                        Precisa de ajuda? <button className="text-primary hover:underline font-bold">Fale com um especialista</button>
                    </p>
                </div>
            </div>
        </div>
    )
}