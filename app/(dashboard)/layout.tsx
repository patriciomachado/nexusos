import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import ClientAIWrapper from '@/components/ai/client-wrapper'
import NotificationGenerator from '@/components/dashboard/NotificationGenerator'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'

import { UserRole } from '@/types'
import { unstable_noStore as noStore } from 'next/cache'

async function ensureUserExists(clerkId: string, email: string, name: string): Promise<UserRole> {
    const db = createAdminClient()
    const normalizedEmail = email.toLowerCase().trim()
    
    try {
        // 1. Tentar buscar pelo clerk_id (mais rápido e seguro)
        const { data: existingUser, error } = await db
            .from('users')
            .select('id, company_id, role')
            .eq('clerk_id', clerkId)
            .single()

        if (existingUser && existingUser.role) {
            console.log(`[AUTH] User found by clerkId: ${clerkId}, role: ${existingUser.role}`)
            return existingUser.role as UserRole
        }

        // 2. Se não achou pelo clerk_id, tentar pelo email (caso de convite ou troca de conta clerk)
        // Usando ilike para garantir case-insensitivity
        const { data: invitedUser } = await db
            .from('users')
            .select('id, company_id, role')
            .ilike('email', normalizedEmail)
            .single()

        if (invitedUser && invitedUser.role) {
            console.log(`[AUTH] User found by email: ${normalizedEmail}, role: ${invitedUser.role}. Updating clerkId.`)
            // Atualiza o clerk_id para o novo ID oficial
            await db.from('users').update({ clerk_id: clerkId }).eq('id', invitedUser.id)
            return invitedUser.role as UserRole
        }

        // 3. Se realmente não existe, cria uma nova empresa e o usuário vira admin
        console.log(`[AUTH] User not found. Creating new company and admin for: ${normalizedEmail}`)
        
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

        if (companyError) {
            console.error('Error creating company:', companyError)
            return 'attendant' as UserRole
        }

        if (company) {
            await db.from('users').insert({
                clerk_id: clerkId,
                email: normalizedEmail,
                full_name: name,
                role: 'admin',
                company_id: company.id,
                is_active: true,
            })
            return 'admin' as UserRole
        }
        
        return 'attendant' as UserRole
    } catch (error) {
        console.error('Error in ensureUserExists:', error)
        return 'attendant' as UserRole
    }
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    noStore()
    const clerkUser = await currentUser()
    if (!clerkUser) redirect('/sign-in')

    const userId = clerkUser.id
    const email = clerkUser.emailAddresses[0]?.emailAddress || ''
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0]

    // Ensure user exists in DB and get their role
    const userRole = await ensureUserExists(userId, email, name)

    return (
        <div className="flex h-screen bg-background overflow-hidden transition-colors duration-300" suppressHydrationWarning>
            <Sidebar userRole={userRole} />
            <main className="flex-1 overflow-y-auto relative pb-20 lg:pb-0" suppressHydrationWarning>
                <NotificationGenerator />
                {children}
            </main>
            <BottomNav userRole={userRole} />
            {/* <ClientAIWrapper /> */}
        </div>
    )
}
