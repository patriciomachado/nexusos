import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import StoresClient from '@/components/settings/StoresClient'
import { getContext } from '@/lib/security'

export default async function StoresPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    return (
        <div className="min-h-full bg-background">
            <Header title="Lojas e filiais" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
                <BackToSettings />
                <StoresClient />
            </div>
        </div>
    )
}
