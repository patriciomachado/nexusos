import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import CustomerForm from '@/components/forms/CustomerForm'

export default async function NewCustomerPage() {
    const { userId } = await auth()
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    return <CustomerForm companyId={user?.company_id} />
}
