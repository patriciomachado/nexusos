import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { serviceOrderSchema, idSchema } from '@/lib/validations/schemas'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { data, error } = await db
        .from('service_orders')
        .select('*, customers(*), technicians(*), service_order_items(*), service_order_attachments(*), service_order_history(*), payments(*)')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Params) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const body = await req.json()
    
    // Validate body
    const validation = serviceOrderSchema.partial().safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { items, ...updateData } = validation.data

    const { data, error } = await db
        .from('service_orders')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Sync items if present in body
    if (body.items && Array.isArray(body.items)) {
        // 1. Delete existing items - ensure they belong to this SO
        await db.from('service_order_items').delete().eq('service_order_id', id)

        // 2. Insert new items with cost tracking
        let totalPartsCost = 0;
        if (body.items.length > 0) {
            const itemsToInsert = []
            
            for (const item of body.items) {
                let unitCost = item.unit_cost || 0
                
                // If inventory item, try to get cost if not provided
                if (item.inventory_item_id && unitCost === 0) {
                    const { data: invItem } = await db
                        .from('inventory_items')
                        .select('cost_price')
                        .eq('id', item.inventory_item_id)
                        .eq('company_id', companyId)
                        .single()
                    if (invItem) unitCost = invItem.cost_price || 0
                }

                const itemTotalCost = unitCost * item.quantity
                totalPartsCost += itemTotalCost

                itemsToInsert.push({
                    service_order_id: id,
                    inventory_item_id: item.inventory_item_id || null,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    unit_cost: unitCost,
                    total_cost: itemTotalCost
                })
            }

            if (itemsToInsert.length > 0) {
                await db.from('service_order_items').insert(itemsToInsert)
            }
        }

        // 3. Update the header parts_cost
        await db
            .from('service_orders')
            .update({ parts_cost: totalPartsCost })
            .eq('id', id)
            .eq('company_id', companyId)
    }

    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { error } = await db
        .from('service_orders')
        .update({ status: 'cancelada' })
        .eq('id', id)
        .eq('company_id', companyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
