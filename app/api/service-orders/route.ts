import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { serviceOrderSchema } from '@/lib/validations/schemas'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = ctx.db
        .from('service_orders')
        .select('*, customers(name, phone), technicians(name)', { count: 'exact' })
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (search) query = query.or(`title.ilike.%${search}%,order_number.ilike.%${search}%`)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const body = await req.json()
    
    // Validate body
    const result = serviceOrderSchema.safeParse(body)
    if (!result.success) {
        return NextResponse.json({ 
            error: 'Dados inválidos', 
            details: result.error.format() 
        }, { status: 400 })
    }

    const validatedData = result.data

    // Generate order number based on the highest existing one
    const { data: lastOS } = await ctx.db
        .from('service_orders')
        .select('order_number')
        .eq('company_id', ctx.companyId)
        .order('order_number', { ascending: false })
        .limit(1)
        .maybeSingle()

    let nextNum = 1
    if (lastOS?.order_number) {
        const currentNum = parseInt(lastOS.order_number.replace('OS-', ''))
        if (!isNaN(currentNum)) {
            nextNum = currentNum + 1
        }
    }
    const orderNumber = `OS-${String(nextNum).padStart(5, '0')}`

    const { data, error } = await ctx.db
        .from('service_orders')
        .insert({
            ...validatedData,
            company_id: ctx.companyId,
            order_number: orderNumber,
            created_by: ctx.dbUser.id,
            // Ensure status/priority have defaults if not provided (though schema handles defaults)
            status: validatedData.status || 'aberta',
            priority: validatedData.priority || 'normal',
            items: undefined // Items handled separately
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Insert items if present
    if (validatedData.items && validatedData.items.length > 0) {
        const itemsToInsert = validatedData.items.map((item: any) => ({
            service_order_id: data.id,
            inventory_item_id: item.inventory_item_id || null,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            unit_cost: item.unit_cost || 0,
            total_cost: item.total_cost || 0,
        }))

        const { error: itemsError } = await ctx.db.from('service_order_items').insert(itemsToInsert)
        if (itemsError) {
            console.error('Error inserting OS items:', itemsError)
        }
    }

    // Log history
    await ctx.db.from('service_order_history').insert({
        service_order_id: data.id,
        changed_by: ctx.dbUser.id,
        changed_by_name: 'Sistema',
        field_name: 'status',
        new_value: validatedData.status || 'aberta',
        change_reason: 'OS criada',
    })

    return NextResponse.json(data, { status: 201 })
}

