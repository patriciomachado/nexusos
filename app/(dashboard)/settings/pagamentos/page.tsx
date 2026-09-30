import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import PaymentMethodsSettings from '@/components/settings/PaymentMethodsSettings'
import { getContext } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'

export default async function PaymentSettingsPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!isOwner(ctx.role)) redirect('/settings')
    return (
        <div className="min-h-full bg-background">
            <Header title="Formas de pagamento" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
                <BackToSettings />
                <PaymentMethodsSettings />
            </div>
        </div>
    )
}
