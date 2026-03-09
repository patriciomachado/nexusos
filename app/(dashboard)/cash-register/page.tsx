import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import CashRegisterClient from './CashRegisterClient'

export default async function CashRegisterPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('role').eq('clerk_id', userId).single()

    // Only Admin can access Cash Register
    if (currentUser?.role !== 'admin') {
        redirect('/dashboard')
    }

    return <CashRegisterClient />
}
