import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import { getContext } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { loadPricing } from '@/lib/pricing-server'
import PricingClient from './PricingClient'

export default async function PricingPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!isOwner(ctx.role)) redirect('/settings')
    const data = await loadPricing(ctx.db, ctx.companyId)
    return (
        <div className="min-h-full bg-background">
            <Header title="Preços" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-4">
                <BackToSettings />
                <PricingClient initial={data} />
            </div>
        </div>
    )
}
