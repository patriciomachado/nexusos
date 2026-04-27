import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()

    const { data, error } = await db
        .from('service_orders')
        .select('*, customers(*), technicians(*), service_order_items(*), service_order_attachments(*), service_order_history(*), payments(*)')
        .eq('id', id)
        .eq('company_id', user?.company_id)
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Params) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    const body = await req.json()
    const { items, customers, technicians, service_order_items, service_order_attachments, service_order_history, payments, ...updateData } = body

    const { data, error } = await db
        .from('service_orders')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', user?.company_id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Sync items if present in body
    if (body.items && Array.isArray(body.items)) {
        // 1. Delete existing items
        await db.from('service_order_items').delete().eq('service_order_id', id)

        // 2. Insert new items
        if (body.items.length > 0) {
            const itemsToInsert = body.items.map((item: any) => ({
                service_order_id: id,
                inventory_item_id: item.inventory_item_id || null,
                item_name: item.item_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
            }))
            await db.from('service_order_items').insert(itemsToInsert)
        }
    }

    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()

    await db
        .from('service_orders')
        .update({ status: 'cancelada' })
        .eq('id', id)
        .eq('company_id', user?.company_id)

    return NextResponse.json({ success: true })
}
