import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import CustomersClient from './CustomersClient'

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ automacoes?: string }> }) {
    // Link antigo das automações: agora elas ficam todas em Configurações → Mensagens automáticas.
    if ((await searchParams).automacoes === '1') redirect('/settings/mensagens')
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('role').eq('clerk_id', userId).single()
    if (!user || user.role === 'customer') redirect('/dashboard')
    return <CustomersClient role={user.role ?? 'attendant'} />
}
