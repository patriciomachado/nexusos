import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import ExportClient from '@/components/settings/ExportClient'
import { getContext } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'

export default async function ExportPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!isManager(ctx.role)) redirect('/settings')
    return (
        <div className="min-h-full bg-background">
            <Header title="Exportar e backup" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
                <BackToSettings />
                <ExportClient owner={isOwner(ctx.role)} />
            </div>
        </div>
    )
}
