import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import PostSalesDashboard from '@/components/post-sales/PostSalesDashboard'

export default async function PostSalesPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    if (!user?.company_id) return null

    // Fetch customer ratings joined with customer name and service order info
    const { data: ratingsData } = await db
        .from('customer_ratings')
        .select(`
            id,
            rating,
            comment,
            sentiment,
            created_at,
            customers (name),
            service_orders!inner (order_number, title, company_id)
        `)
        .eq('service_orders.company_id', user.company_id)
        .order('created_at', { ascending: false })

    const ratings = (ratingsData || []).map((item: any) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        sentiment: item.sentiment,
        created_at: item.created_at,
        customer_name: item.customers?.name || 'Cliente Oculto',
        order_number: item.service_orders?.order_number || 'OS-N/A',
        order_title: item.service_orders?.title || 'Serviço Geral'
    }))

    return <PostSalesDashboard initialRatings={ratings} />
}
