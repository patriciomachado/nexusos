import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import OSEditForm from '@/components/os/form/OSEditForm'

export default async function EditServiceOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    const { id } = await params
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const companyId = user?.company_id

    if (!companyId) return notFound()

    // Fetch OS details
    const { data: os } = await db
        .from('service_orders')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

    if (!os) notFound()

    // Fetch related data for the form
    const [
        { data: customers },
        { data: technicians },
        { data: inventoryItems },
        { data: osItems }
    ] = await Promise.all([
        db.from('customers').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('technicians').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('inventory_items').select('id, name, selling_price, cost_price, category').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('service_order_items').select('*').eq('service_order_id', id)
    ])

    return (
        <div className="min-h-full flex flex-col bg-background">
            <Header title={`Editar ${os.order_number}`} subtitle={os.title} />
            <OSEditForm
                order={{ ...os, items: osItems ?? [] }}
                customers={customers || []}
                technicians={technicians || []}
                inventory={inventoryItems || []}
                companyId={companyId}
            />
        </div>
    )
}
