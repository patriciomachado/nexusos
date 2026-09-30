import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import { getContext } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { offModules } from '@/lib/modules'
import ModulesClient from './ModulesClient'

export default async function ModulesPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!isOwner(ctx.role)) redirect('/settings')
    const { data } = await ctx.db.from('companies').select('settings').eq('id', ctx.companyId).single()
    return (
        <div className="min-h-full bg-background">
            <Header title="Módulos" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
                <BackToSettings />
                <ModulesClient initialOff={offModules(data?.settings)} />
            </div>
        </div>
    )
}
