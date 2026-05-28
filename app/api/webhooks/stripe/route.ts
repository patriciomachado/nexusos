import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

function getStripe() {
    const Stripe = require('stripe')
    return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2026-04-22.dahlia'
    })
}

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature || !WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const stripe = getStripe()
    let event: any

    try {
        event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
    } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const db = createAdminClient()

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as any
            const companyId = session.metadata?.company_id

            if (!companyId) {
                console.error('No company_id in session metadata')
                return NextResponse.json({ error: 'No company_id' }, { status: 400 })
            }

            // Fetch the subscription details from Stripe to get period dates
            const stripe = getStripe()
            let currentPeriodStart = new Date().toISOString()
            let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Fallback 30 days

            if (session.subscription) {
                const subscription = await stripe.subscriptions.retrieve(session.subscription)
                currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString()
                currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
            }

            // Update subscription
            await db
                .from('subscriptions')
                .upsert({
                    company_id: companyId,
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: session.subscription,
                    status: 'active',
                    current_period_start: currentPeriodStart,
                    current_period_end: currentPeriodEnd,
                    updated_at: new Date().toISOString()
                })
            
            // Also update company status for redundancy/compatibility
            await db
                .from('companies')
                .update({ 
                    subscription_status: 'active',
                    subscription_end_date: currentPeriodEnd.split('T')[0] 
                })
                .eq('id', companyId)

            break
        }

        case 'customer.subscription.updated': {
            const subscription = event.data.object as any
            const { data: existing } = await db
                .from('subscriptions')
                .select('company_id')
                .eq('stripe_subscription_id', subscription.id)
                .single()

            if (existing) {
                const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
                
                await db
                    .from('subscriptions')
                    .update({
                        status: subscription.status,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: currentPeriodEnd,
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        updated_at: new Date().toISOString()
                    })
                    .eq('stripe_subscription_id', subscription.id)

                // Sync with companies table
                await db
                    .from('companies')
                    .update({ 
                        subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
                        subscription_end_date: currentPeriodEnd.split('T')[0]
                    })
                    .eq('id', existing.company_id)
            }
            break
        }

        case 'customer.subscription.deleted': {
            const subscriptionAny = event.data.object as any
            const { data: existing } = await db
                .from('subscriptions')
                .select('company_id')
                .eq('stripe_subscription_id', subscriptionAny.id)
                .single()

            if (existing) {
                await db
                    .from('subscriptions')
                    .update({ 
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('stripe_subscription_id', subscriptionAny.id)

                await db
                    .from('companies')
                    .update({ subscription_status: 'cancelled' })
                    .eq('id', existing.company_id)
            }
            break
        }

        default:
            console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
}