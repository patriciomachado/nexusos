import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getContext } from '@/lib/security'
import { ADMIN_ROLES } from '@/lib/alice/config'
import Header from '@/components/layout/Header'
import AliceAdmin from '@/components/alice/admin/AliceAdmin'

export const metadata = { title: 'Alice · Nexus OS' }

export default async function AlicePage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    // Configuration, WhatsApp chats and the activity log are for the administrator.
    if (!ADMIN_ROLES.includes(ctx.role)) redirect('/dashboard')

    return (
        <div className="min-h-screen bg-background">
            <Header title="Alice" subtitle="Assistente de IA no app e atendimento no WhatsApp" />
            <Suspense>
                <AliceAdmin />
            </Suspense>
        </div>
    )
}
