import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import NewOSForm from '@/components/forms/NewOSForm'

export default async function NewServiceOrderPage() {
    const { userId } = await auth()
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const companyId = user?.company_id
    const { data: company } = await db.from('companies').select('warranty_terms').eq('id', companyId).single()

    const [{ data: customers }, { data: technicians }, { data: inventoryItems }] = await Promise.all([
        db.from('customers').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('technicians').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('inventory_items').select('id, name, selling_price, category').eq('company_id', companyId).eq('is_active', true).order('name'),
    ])

    return (
        <div className="animate-fade-in">
            <Header title="Nova Ordem de Serviço" />
            <NewOSForm
                customers={customers || []}
                technicians={technicians || []}
                companyId={companyId}
                inventoryItems={inventoryItems || []}
                warrantyTerms={company?.warranty_terms}
            />
        </div>
    )
}
