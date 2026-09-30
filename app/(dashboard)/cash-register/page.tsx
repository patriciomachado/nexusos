import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import CashRegisterClient from './CashRegisterClient'

export default async function CashRegisterPage({ searchParams }: { searchParams: Promise<{ ajustes?: string }> }) {
    const { ajustes } = await searchParams
    const { userId } = await auth()
    if (!userId) redirect('/entrar')

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('id, role').eq('clerk_id', userId).single()
    if (!currentUser) redirect('/dashboard')

    // Everyone can run their own register; managers also see the others and the history.
    return <CashRegisterClient role={currentUser.role ?? 'attendant'} userId={currentUser.id} openSettings={ajustes === '1'} />
}
