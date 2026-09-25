import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import AlicePanel from '@/components/alice/AlicePanel'
import NotificationGenerator from '@/components/dashboard/NotificationGenerator'
import ReminderWatcher from '@/components/tasks/ReminderWatcher'
import QuickAddDialog from '@/components/tasks/QuickAddDialog'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'

import { UserRole } from '@/types'
import { unstable_noStore as noStore } from 'next/cache'

async function ensureUserExists(clerkId: string, email: string, name: string): Promise<{ role: UserRole, companyId: string | null }> {
    const db = createAdminClient()
    const normalizedEmail = email.toLowerCase().trim()
    
    try {
        // 1. Tentar buscar pelo clerk_id
        const { data: existingUser } = await db
            .from('users')
            .select('id, company_id, role')
            .eq('clerk_id', clerkId)
            .single()

        if (existingUser && existingUser.role) {
            return { role: existingUser.role as UserRole, companyId: existingUser.company_id }
        }

        // 2. Se não achou pelo clerk_id, tentar pelo email
        const { data: invitedUser } = await db
            .from('users')
            .select('id, company_id, role')
            .ilike('email', normalizedEmail)
            .single()

        if (invitedUser && invitedUser.role) {
            await db.from('users').update({ clerk_id: clerkId }).eq('id', invitedUser.id)
            return { role: invitedUser.role as UserRole, companyId: invitedUser.company_id }
        }

        // 3. Criar nova empresa e admin
        const { data: company, error: companyError } = await db
            .from('companies')
            .insert({
                name: `Empresa de ${name}`,
                subscription_plan: 'essencial',
                subscription_status: 'trial',
                max_users: 3,
                max_os_per_month: 100,
            })
            .select()
            .single()

        if (companyError || !company) {
            console.error('Error creating company:', companyError)
            return { role: 'attendant' as UserRole, companyId: null }
        }

        // Initialize subscription record for the new company
        await db.from('subscriptions').insert({
            company_id: company.id,
            status: 'trial',
            trial_started_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days trial
        })

        await db.from('users').insert({
            clerk_id: clerkId,
            email: normalizedEmail,
            full_name: name,
            role: 'admin',
            company_id: company.id,
            is_active: true,
        })

        return { role: 'admin' as UserRole, companyId: company.id }
    } catch (error) {
        console.error('Error in ensureUserExists:', error)
        return { role: 'attendant' as UserRole, companyId: null }
    }
}

import { getSubscriptionStatus } from '@/lib/subscription'
import { getCompanyPlan } from '@/lib/plan-server'
import { SubscriptionStatusGuard } from '@/components/subscription/SubscriptionStatusGuard'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    noStore()
    const clerkUser = await currentUser()
    if (!clerkUser) redirect('/entrar')

    const userId = clerkUser.id
    const email = clerkUser.emailAddresses[0]?.emailAddress || ''
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0]

    // Ensure user exists and get their company info
    const { role, companyId } = await ensureUserExists(userId, email, name)

    // Check subscription status
    let subscription = { isValid: true, isTrialing: true, daysRemaining: 15 }
    if (companyId) {
        subscription = await getSubscriptionStatus(companyId)
    }
    const plan = await getCompanyPlan(createAdminClient(), companyId)

    return (
        <>
        {/* Pinned to the screen edges instead of 100dvh: in the installed iPhone app
            the dynamic viewport height can get stuck short (e.g. after the keyboard
            closes), which left a blank strip at the bottom. */}
        <div className="fixed inset-x-0 bottom-0 top-[env(safe-area-inset-top)] flex bg-background overflow-hidden max-w-full w-full transition-colors duration-300" suppressHydrationWarning>
            <Sidebar userRole={role} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-[env(safe-area-inset-bottom)] w-full max-w-full" suppressHydrationWarning>
                <NotificationGenerator />
                <SubscriptionStatusGuard 
                    plan={plan}
                    isValid={subscription.isValid} 
                    isTrialing={subscription.isTrialing} 
                    daysRemaining={subscription.daysRemaining}
                >
                    {children}
                </SubscriptionStatusGuard>
            </main>
            <BottomNav userRole={role} />
            {(role === 'admin' || role === 'owner') && (
                <>
                    <ReminderWatcher />
                    <QuickAddDialog />
                </>
            )}
            <AlicePanel />
        </div>
        </>
    )
}
