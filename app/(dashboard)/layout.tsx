import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import ClientAIWrapper from '@/components/ai/client-wrapper'
import NotificationGenerator from '@/components/dashboard/NotificationGenerator'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase as db } from '@/lib/supabase'

import { UserRole } from '@/types'

async function ensureUserExists(clerkId: string, email: string, name: string): Promise<UserRole> {
    try {
        const { data: existingUser, error } = await db
            .from('users')
            .select('id, company_id, role')
            .eq('clerk_id', clerkId)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user:', error)
            throw new Error('User fetch failed')
        }

        if (existingUser && existingUser.role) {
            return existingUser.role as UserRole
        }

        // Se usuário existe mas sem role, retorna attendant como padrão
        if (existingUser && !existingUser.role) {
            return 'attendant' as UserRole
        }

        // Primeiro, verifica se o usuário foi convidado e já existe na base pelo email
        const { data: invitedUser } = await db
            .from('users')
            .select('id, company_id, role')
            .eq('email', email)
            .single()

        if (invitedUser && invitedUser.role) {
            // Se encontrou, atualiza o clerk_id do convite com o ID oficial do Clerk
            await db.from('users').update({ clerk_id: clerkId }).eq('id', invitedUser.id)
            return invitedUser.role as UserRole
        }

        // Se não foi convidado e não existe empresa, cria uma nova empresa (novo Admin)
        const { data: company } = await db
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

        if (company) {
            await db.from('users').insert({
                clerk_id: clerkId,
                email,
                full_name: name,
                role: 'admin',
                company_id: company.id,
                is_active: true,
            })
        }
        return 'admin' as UserRole
    } catch (error) {
        console.error('Error in ensureUserExists:', error)
        return 'admin' as UserRole
    }
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
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
