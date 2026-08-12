import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createAdminClient()

    // Step 1: get user
    const { data: user, error: userError } = await db
        .from('users')
        .select('company_id, role, clerk_id')
        .eq('clerk_id', userId)
        .single()

    const companyId = user?.company_id

    // Step 2: count service_orders for this company
    const { count: osCount } = await db
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

    // Step 3: count ALL service_order_items (no filter)
    const { count: allItemsCount } = await db
        .from('service_order_items')
        .select('*', { count: 'exact', head: true })

    // Step 4: fetch first 5 service_order_items directly
    const { data: sampleItems, error: itemsError } = await db
        .from('service_order_items')
        .select('id, item_name, quantity, total_price, service_order_id')
        .limit(5)

    // Step 5: fetch service_orders with items via join
    const { data: ordersWithItems, error: joinError } = await db
        .from('service_orders')
        .select('id, service_order_items(id, item_name, quantity)')
        .eq('company_id', companyId)
        .limit(5)

    // Step 6: check total items via join
    const joinedItems = (ordersWithItems || []).flatMap((o: any) => o.service_order_items || [])

    return NextResponse.json({
        userId,
        user,
        userError,
        companyId,
        osCount,
        allItemsCount,
        sampleItems,
        itemsError: itemsError?.message,
        joinError: joinError?.message,
        ordersWithItems,
        joinedItemsCount: joinedItems.length,
        joinedItemsSample: joinedItems.slice(0, 3),
    })
}
