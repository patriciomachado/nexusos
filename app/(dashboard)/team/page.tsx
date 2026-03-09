import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import TeamClient from './TeamClient'

export default async function TeamPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('role').eq('clerk_id', userId).single()
    if (currentUser?.role === 'technician' || currentUser?.role === 'cashier' || currentUser?.role === 'attendant') {
        redirect('/dashboard')
    }

    return <TeamClient />
}
