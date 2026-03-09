import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const { searchParams } = new URL(req.url)
    const lowStock = searchParams.get('low_stock') === 'true'
    const search = searchParams.get('search')

    let query = db.from('inventory_items').select('*', { count: 'exact' }).eq('company_id', user?.company_id).eq('is_active', true)

    if (lowStock) query = query.filter('quantity_in_stock', 'lte', 'minimum_quantity')
    if (search) {
        query = query.or(`name.ilike.%${search}%,barcode.eq.${search},sku.eq.${search}`)
    }

    const { data, error, count } = await query.order('name').limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const body = await req.json()
    const { data, error } = await db.from('inventory_items').insert({ ...body, company_id: user?.company_id }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
