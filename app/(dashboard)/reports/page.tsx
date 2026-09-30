import { redirect } from 'next/navigation'
import { getContext } from '@/lib/security'
import Header from '@/components/layout/Header'
import ReportsClient from '@/components/reports/ReportsClient'

export const metadata = { title: 'Relatórios · Nexus OS' }

export default async function ReportsPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!['admin', 'owner', 'manager'].includes(ctx.role)) redirect('/dashboard')

    return (
        <div className="min-h-screen bg-background">
            <Header title="Relatórios" subtitle="Faturamento, resultado, operação, equipe e clientes" />
            <ReportsClient canEditGoal={['admin', 'owner'].includes(ctx.role)} />
        </div>
    )
}
