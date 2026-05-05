import { createAdminClient } from './supabase'

export interface SubscriptionStatus {
    isValid: boolean
    status: string
    currentPeriodEnd: Date | null
    isExpired: boolean
    daysRemaining: number
    isTrialing: boolean
}

export async function getSubscriptionStatus(companyId: string): Promise<SubscriptionStatus> {
    const db = createAdminClient()
    const { data: subscription, error } = await db
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .single()

    if (error || !subscription) {
        return { 
            isValid: false, 
            status: 'none', 
            currentPeriodEnd: null, 
            isExpired: true, 
            daysRemaining: 0,
            isTrialing: false
        }
    }

    const now = new Date()
    const currentPeriodEnd = new Date(subscription.current_period_end)
    const isExpired = currentPeriodEnd < now
    const isTrialing = subscription.status === 'trial'
    
    // Valid if status is active (Stripe confirmed) OR if trialing and not expired
    const isValid = subscription.status === 'active' || (isTrialing && !isExpired)

    return {
        isValid,
        status: subscription.status,
        currentPeriodEnd,
        isExpired,
        daysRemaining: Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        isTrialing
    }
}
