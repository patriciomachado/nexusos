import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import CustomerForm from '@/components/forms/CustomerForm'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    const { id } = await params
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const companyId = user?.company_id

    if (!companyId) return notFound()

    // Fetch Customer details
    const { data: customer } = await db
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

    if (!customer) notFound()

    return (
        <div className="animate-fade-in">
            <CustomerForm
                companyId={companyId}
                customerId={id}
                initial={customer}
            />
        </div>
    )
}
