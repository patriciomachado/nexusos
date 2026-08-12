import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createAdminClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days

    const { data: user } = await db
        .from('users')
        .select('company_id')
        .eq('clerk_id', userId)
        .single()

    if (!user?.company_id) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const companyId = user.company_id
    const since = new Date()
    since.setDate(since.getDate() - Number(period))
    const sinceStr = since.toISOString()

    // Fetch all service_order_items for this company in the period
    const { data: osItems } = await db
        .from('service_order_items')
        .select(`
            id,
            name,
            quantity,
            unit_price,
            total_price,
            inventory_item_id,
            service_order_id,
            service_orders!inner(company_id, created_at, status)
        `)
        .eq('service_orders.company_id', companyId)
        .gte('service_orders.created_at', sinceStr)

    // Fetch all service_order_items ever (for all-time ranking)
    const { data: allTimeItems } = await db
        .from('service_order_items')
        .select(`
            id,
            name,
            quantity,
            unit_price,
            total_price,
            inventory_item_id,
            service_orders!inner(company_id)
        `)
        .eq('service_orders.company_id', companyId)

    // Fetch inventory items for stock cross-reference
    const { data: inventoryItems } = await db
        .from('inventory_items')
        .select('id, name, quantity_in_stock, minimum_quantity, cost_price, sale_price, sku')
        .eq('company_id', companyId)
        .eq('is_active', true)

    // --- Aggregate ranking from period items ---
    const rankingMap: Record<string, {
        name: string
        totalQty: number
        totalRevenue: number
        avgPrice: number
        osCount: number
        inventoryItemId: string | null
        inventoryStock: number | null
        minimumStock: number | null
    }> = {}

    for (const item of osItems || []) {
        const key = item.inventory_item_id || item.name.toLowerCase().trim()
        if (!rankingMap[key]) {
            // Try to match with inventory by id or name
            const invMatch = inventoryItems?.find(inv =>
                inv.id === item.inventory_item_id ||
                inv.name.toLowerCase().trim() === item.name.toLowerCase().trim()
            )
            rankingMap[key] = {
                name: item.name,
                totalQty: 0,
                totalRevenue: 0,
                avgPrice: 0,
                osCount: 0,
                inventoryItemId: item.inventory_item_id || invMatch?.id || null,
                inventoryStock: invMatch?.quantity_in_stock ?? null,
                minimumStock: invMatch?.minimum_quantity ?? null,
            }
        }
        rankingMap[key].totalQty += Number(item.quantity) || 1
        rankingMap[key].totalRevenue += Number(item.total_price) || 0
        rankingMap[key].osCount += 1
    }

    // Compute avgPrice
    for (const key in rankingMap) {
        const r = rankingMap[key]
        r.avgPrice = r.totalQty > 0 ? r.totalRevenue / r.totalQty : 0
    }

    const ranking = Object.values(rankingMap)
        .sort((a, b) => b.totalQty - a.totalQty)

    // --- All-time totals ---
    const allTimeTotals = (allTimeItems || []).reduce(
        (acc, item) => {
            acc.totalItems += Number(item.quantity) || 1
            acc.totalRevenue += Number(item.total_price) || 0
            return acc
        },
        { totalItems: 0, totalRevenue: 0 }
    )

    // --- Summary stats for period ---
    const periodTotalQty = ranking.reduce((s, r) => s + r.totalQty, 0)
    const periodTotalRevenue = ranking.reduce((s, r) => s + r.totalRevenue, 0)

    // --- Unregistered parts (used in OS but not in inventory) ---
    const unregistered = ranking.filter(r => r.inventoryItemId === null)

    // --- Inventory alerts (low stock) ---
    const lowStock = (inventoryItems || []).filter(
        inv => inv.quantity_in_stock <= inv.minimum_quantity
    )

    return NextResponse.json({
        ranking,
        summary: {
            periodTotalQty,
            periodTotalRevenue,
            totalInventoryItems: inventoryItems?.length || 0,
            lowStockCount: lowStock.length,
            unregisteredCount: unregistered.length,
            topPart: ranking[0]?.name || null,
            allTimeTotalItems: allTimeTotals.totalItems,
            allTimeTotalRevenue: allTimeTotals.totalRevenue,
        },
        lowStock,
        unregistered: unregistered.slice(0, 10),
    })
}
