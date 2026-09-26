import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import ProductsClient, { type Product } from './ProductsClient'

export default async function InventoryPage() {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('role, company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) redirect('/dashboard')
    if (user.role === 'technician' || user.role === 'cashier' || user.role === 'attendant') redirect('/dashboard')

    const { data: items } = await db
        .from('inventory_items')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('is_active', true)
        .order('name')
        .limit(3000)

    return <ProductsClient initial={(items ?? []) as Product[]} />
}
