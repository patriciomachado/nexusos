import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getContext } from '@/lib/security'
import { canUseAlice, isAdminRole, loadSettings } from '@/lib/alice/config'
import Header from '@/components/layout/Header'
import AliceAdmin from '@/components/alice/admin/AliceAdmin'

export const metadata = { title: 'Alice · Nexus OS' }

export default async function AlicePage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!ctx.companyId) redirect('/dashboard')
    // Configuration and the activity log stay admin-only; the WhatsApp inbox also opens for
    // staff roles the admin allowed in Alice → Configurações (same list as Alice in the app).
    // Admins always get in — even on a plan without Alice — so they can see why and upgrade.
    const settings = await loadSettings(ctx.db, ctx.companyId)
    if (!isAdminRole(ctx.role) && !canUseAlice(ctx.role, settings)) redirect('/dashboard')

    return (
        <div className="min-h-screen bg-background">
            <Header title="Alice" subtitle="Assistente de IA no app e atendimento no WhatsApp" />
            <Suspense>
                <AliceAdmin />
            </Suspense>
        </div>
    )
}
