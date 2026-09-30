import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { loadItemOptions } from '@/lib/os/options'
import Header from '@/components/layout/Header'
import OSWizard from '@/components/os/form/OSWizard'

export default async function NewServiceOrderPage({ searchParams }: { searchParams: Promise<{ quote_id?: string }> }) {
    const { userId } = await auth()
    const db = createAdminClient()
    const { quote_id } = await searchParams

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const companyId = user?.company_id

    const [{ data: customers }, { data: technicians }, { inventory: inventoryItems, prices }, quote] = await Promise.all([
        db.from('customers').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('technicians').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        loadItemOptions(db, companyId),
        quote_id
            ? db.from('part_quotes').select('id, device_model, service').eq('id', quote_id).eq('company_id', companyId).is('service_order_id', null).maybeSingle().then(r => r.data)
            : Promise.resolve(null),
    ])

    return (
        <div className="min-h-full flex flex-col bg-background">
            <Header title="Nova OS" />
            <OSWizard
                customers={customers || []}
                technicians={technicians || []}
                inventory={inventoryItems || []}
                prices={prices}
                companyId={companyId}
                initialQuote={quote ? { id: quote.id, deviceModel: quote.device_model, service: quote.service } : null}
            />
        </div>
    )
}
