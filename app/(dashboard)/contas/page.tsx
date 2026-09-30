import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import ContasClient from './ContasClient'

export default async function ContasPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('role').eq('clerk_id', userId).single()
    if (!['admin', 'owner', 'manager'].includes(user?.role ?? '')) redirect('/dashboard')
    const { aba } = await searchParams
    return <ContasClient initialTab={aba === 'receber' ? 'receive' : 'pay'} />
}
