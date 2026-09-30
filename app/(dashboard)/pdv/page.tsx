import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import PdvClient from './PdvClient'

export default async function PDVPage() {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id, role').eq('clerk_id', userId).single()
    if (!user?.company_id) redirect('/dashboard')
    return <PdvClient companyId={user.company_id} role={user.role ?? 'attendant'} />
}
