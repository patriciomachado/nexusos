import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import StoreForm, { type StoreFormCompany } from '@/components/settings/StoreForm'
import { getContext } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'

export default async function StoreSettingsPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!isOwner(ctx.role)) redirect('/settings')
    const { data: company } = await ctx.db
        .from('companies')
        .select('id, name, cnpj, email, phone, address, city, state, zip_code, logo_url, warranty_terms, google_review_url, cash_cycle, auto_close_cash')
        .eq('id', ctx.companyId)
        .single()
    if (!company) redirect('/settings')

    return (
        <div className="min-h-full bg-background">
            <Header title="Dados da loja" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
                <BackToSettings />
                <StoreForm company={company as StoreFormCompany} />
            </div>
        </div>
    )
}
