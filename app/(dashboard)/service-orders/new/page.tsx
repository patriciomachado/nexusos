import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { loadItemOptions } from '@/lib/os/options'
import Header from '@/components/layout/Header'
import OSWizard from '@/components/os/form/OSWizard'

export default async function NewServiceOrderPage() {
    const { userId } = await auth()
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const companyId = user?.company_id

    const [{ data: customers }, { data: technicians }, { inventory: inventoryItems, prices }] = await Promise.all([
        db.from('customers').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('technicians').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        loadItemOptions(db, companyId),
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
            />
        </div>
    )
}
