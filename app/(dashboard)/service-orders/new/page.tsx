import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import OSWizard from '@/components/os/form/OSWizard'

export default async function NewServiceOrderPage() {
    const { userId } = await auth()
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const companyId = user?.company_id

    const [{ data: customers }, { data: technicians }, { data: inventoryItems }] = await Promise.all([
        db.from('customers').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('technicians').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('inventory_items').select('id, name, selling_price, cost_price, category').eq('company_id', companyId).eq('is_active', true).order('name'),
    ])

    return (
        <div className="min-h-full flex flex-col bg-background">
            <Header title="Nova OS" />
            <OSWizard
                customers={customers || []}
                technicians={technicians || []}
                inventory={inventoryItems || []}
                companyId={companyId}
            />
        </div>
    )
}
