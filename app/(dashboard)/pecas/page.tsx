import { redirect } from 'next/navigation'
import { getContext } from '@/lib/security'
import { isManager } from '@/lib/cash/server'
import PecasClient from './PecasClient'

export default async function PecasPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    // Costs, suppliers and purchases are for the owner and managers.
    if (!isManager(ctx.role)) redirect('/dashboard')
    const { tab } = await searchParams
    return <PecasClient initialTab={tab} />
}
