import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import PecasClient from './PecasClient'

export default async function PecasPage() {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')

    const db = createAdminClient()

    const { data: currentUser } = await db
        .from('users')
        .select('role, company_id')
        .eq('clerk_id', userId)
        .single()

    if (
        currentUser?.role === 'technician' ||
        currentUser?.role === 'cashier' ||
        currentUser?.role === 'attendant'
    ) {
        redirect('/dashboard')
    }

    const companyId = currentUser?.company_id

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // CORRECTED: Query service_orders (filtered by company_id) and join items.
    // Filtering on related table columns (.eq('service_orders.company_id', ...)) 
    // is silently ignored by Supabase PostgREST — must filter on the root table.
    const [
        { data: recentOrders },
        { data: allOrders },
        { data: inventoryItems },
    ] = await Promise.all([
        db
            .from('service_orders')
            .select('id, equipment_description, service_order_items(id, item_name, quantity, unit_price, total_price, inventory_item_id)')
            .eq('company_id', companyId)
            .gte('created_at', thirtyDaysAgo.toISOString()),

        db
            .from('service_orders')
            .select('id, service_order_items(id, item_name, quantity, total_price)')
            .eq('company_id', companyId),

        db
            .from('inventory_items')
            .select('id, name, quantity_in_stock, minimum_quantity, cost_price, sale_price, sku, category_id')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .order('name'),
    ])

    // Flatten items arrays from each order
    const recentOsItems: any[] = (recentOrders || []).flatMap(
        (order: any) => order.service_order_items || []
    )
    const allOsItems: any[] = (allOrders || []).flatMap(
        (order: any) => order.service_order_items || []
    )

    // Build ranking map from recent 30d items
    type RankEntry = {
        name: string
        totalQty: number
        totalRevenue: number
        osCount: number
        inventoryItemId: string | null
        inventoryStock: number | null
        minimumStock: number | null
        costPrice: number | null
    }

    const rankingMap: Record<string, RankEntry> = {}

    for (const item of recentOsItems) {
        const key = item.inventory_item_id
            ? `inv_${item.inventory_item_id}`
            : `name_${(item.item_name || '').toLowerCase().trim()}`

        if (!rankingMap[key]) {
            const invMatch = (inventoryItems || []).find((inv: any) =>
                inv.id === item.inventory_item_id ||
                inv.name.toLowerCase().trim() === (item.item_name || '').toLowerCase().trim()
            )
            rankingMap[key] = {
                name: item.item_name || '(sem nome)',
                totalQty: 0,
                totalRevenue: 0,
                osCount: 0,
                inventoryItemId: item.inventory_item_id || invMatch?.id || null,
                inventoryStock: invMatch?.quantity_in_stock ?? null,
                minimumStock: invMatch?.minimum_quantity ?? null,
                costPrice: invMatch?.cost_price ?? null,
            }
        }
        rankingMap[key].totalQty += Number(item.quantity) || 1
        rankingMap[key].totalRevenue += Number(item.total_price) || 0
        rankingMap[key].osCount += 1
    }

    const ranking = Object.values(rankingMap).sort((a, b) => b.totalQty - a.totalQty)

    // --- Build device ranking from equipment_description ---
    type DeviceEntry = { model: string; count: number }
    const deviceMap: Record<string, DeviceEntry> = {}
    for (const order of recentOrders || []) {
        const model = (order as any).equipment_description?.trim()
        if (!model) continue
        const key = model.toLowerCase()
        if (!deviceMap[key]) deviceMap[key] = { model, count: 0 }
        deviceMap[key].count += 1
    }
    const deviceRanking = Object.values(deviceMap).sort((a, b) => b.count - a.count)

    const allTimeTotalQty = allOsItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0)
    const allTimeTotalRevenue = allOsItems.reduce((s, i) => s + (Number(i.total_price) || 0), 0)

    const periodTotalQty = ranking.reduce((s, r) => s + r.totalQty, 0)
    const periodTotalRevenue = ranking.reduce((s, r) => s + r.totalRevenue, 0)
    const lowStockItems = (inventoryItems || []).filter((i: any) => i.quantity_in_stock <= i.minimum_quantity)
    const unregistered = ranking.filter(r => r.inventoryItemId === null)

    return (
        <div className="animate-fade-in pb-12 bg-background min-h-screen transition-colors duration-300">
            <Header title="Peças & Componentes" />
            <PecasClient
                ranking={ranking}
                inventoryItems={inventoryItems || []}
                lowStockItems={lowStockItems}
                unregisteredParts={unregistered}
                deviceRanking={deviceRanking}
                summary={{
                    periodTotalQty,
                    periodTotalRevenue,
                    totalInventoryItems: inventoryItems?.length || 0,
                    lowStockCount: lowStockItems.length,
                    unregisteredCount: unregistered.length,
                    topPart: ranking[0]?.name || null,
                    allTimeTotalQty,
                    allTimeTotalRevenue,
                }}
            />
        </div>
    )
}
