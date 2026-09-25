import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import TeamClient from './TeamClient'

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: me } = await db.from('users').select('id, role, company_id, companies(name)').eq('clerk_id', userId).single()
    if (!me) redirect('/dashboard')
    const company = Array.isArray(me.companies) ? me.companies[0] : me.companies
    // Everyone uses the time clock; managers also run the team.
    return <TeamClient role={me.role ?? 'attendant'} meId={me.id} storeName={(company as { name?: string } | null)?.name ?? 'a loja'} initialTab={tab} />
}
