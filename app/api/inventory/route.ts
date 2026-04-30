import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { inventoryItemSchema } from '@/lib/validations/schemas'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { searchParams } = new URL(req.url)
    const lowStock = searchParams.get('low_stock') === 'true'
    const search = searchParams.get('search')

    let query = db.from('inventory_items')
        .select('*, product_categories(name)', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('is_active', true)

    if (lowStock) query = query.filter('quantity_in_stock', 'lte', 'minimum_quantity')
    if (search) {
        query = query.or(`name.ilike.%${search}%,barcode.eq.${search},sku.eq.${search}`)
    }

    const { data, error, count } = await query.order('name').limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const body = await req.json()
    
    const validation = inventoryItemSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await db
        .from('inventory_items')
        .insert({ ...validation.data, company_id: companyId })
        .select()
        .single()
        
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
