import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

const TRIAL_DAYS = 15
const MONTHLY_PRICE = 9900
const MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_99'
const ANNUAL_PRICE = 9900 // R$ 99,00 em centavos

function getStripe() {
    const Stripe = require('stripe')
    return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2026-04-22.dahlia'
    })
}

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx

    // Get subscription for company
    const { data: subscription, error } = await db
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .single()

    if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no subscription, create trial
    if (!subscription) {
        const { data: newSub, error: createError } = await db
            .from('subscriptions')
            .insert({
                company_id: companyId,
                status: 'trial',
                trial_started_at: new Date().toISOString(),
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single()

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json({
            subscription: {
                ...newSub,
                trial_days_remaining: TRIAL_DAYS,
                is_trialing: true
            }
        })
    }

    // Calculate days remaining
    const now = new Date()
    const end = new Date(subscription.current_period_end)
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const isTrialing = subscription.status === 'trial'

    return NextResponse.json({
        subscription: {
            ...subscription,
            trial_days_remaining: daysRemaining,
            is_trialing: isTrialing
        }
    })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, userId } = ctx
    const body = await req.json()
    const { action, priceId } = body

    // Get current subscription
    const { data: subscription } = await db
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .single()

    try {
        if (action === 'create-checkout-session') {
            if (!process.env.CAKTO_CLIENT_ID || !process.env.CAKTO_CLIENT_SECRET) {
                return NextResponse.json({ error: 'Cakto credentials not configured' }, { status: 503 })
            }
            
            // Get company info
            const { data: company } = await db
                .from('companies')
                .select('name, email')
                .eq('id', companyId)
                .single()

            if (!company) {
                return NextResponse.json({ error: 'Company not found' }, { status: 404 })
            }

            // Cakto checkout urls are simple links pointing to pay.cakto.com.br/product_id
            // We can prefill customer details in query parameters like name and email
            const productId = process.env.CAKTO_PRODUCT_ID || 'gs38yot_931352'
            const checkoutUrl = `https://pay.cakto.com.br/${productId}?email=${encodeURIComponent(company.email || '')}&name=${encodeURIComponent(company.name || '')}&metadata_company_id=${companyId}`
            
            return NextResponse.json({ url: checkoutUrl })
        }

        if (action === 'create-portal-session') {
            if (!process.env.STRIPE_SECRET_KEY) {
                return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
            }
            const stripe = getStripe()
            
            if (!subscription?.stripe_customer_id) {
                return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
            }

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            const session = await stripe.billingPortal.sessions.create({
                customer: subscription.stripe_customer_id,
                return_url: `${appUrl}/settings/subscription`
            })

            return NextResponse.json({ url: session.url })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        console.error('Stripe Error:', err)
        return NextResponse.json({ 
            error: err.message || 'Internal Server Error',
            details: err.type || 'Unknown error type'
        }, { status: 500 })
    }
}