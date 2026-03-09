import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const body = await req.json()

    const { data: item } = await db.from('inventory_items').select('quantity_in_stock').eq('id', id).eq('company_id', user?.company_id).single()
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const newQty = Number(item.quantity_in_stock) + Number(body.quantity)
    if (newQty < 0) return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })

    const { data, error } = await db
        .from('inventory_items')
        .update({ quantity_in_stock: newQty })
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
