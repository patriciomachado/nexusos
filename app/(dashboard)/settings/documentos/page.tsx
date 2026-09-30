import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import DocumentsForm from '@/components/settings/DocumentsForm'
import { getContext } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { readDocuments } from '@/lib/settings/documents'

export default async function DocumentsSettingsPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!isOwner(ctx.role)) redirect('/settings')
    const { data: company } = await ctx.db.from('companies').select('name, logo_url, phone, city, settings').eq('id', ctx.companyId).single()

    return (
        <div className="min-h-full bg-background">
            <Header title="Recibo e OS" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
                <BackToSettings />
                <DocumentsForm
                    initial={readDocuments(company?.settings)}
                    store={{ name: company?.name ?? 'Minha loja', logo_url: company?.logo_url ?? null, phone: company?.phone ?? null, city: company?.city ?? null }}
                />
            </div>
        </div>
    )
}
