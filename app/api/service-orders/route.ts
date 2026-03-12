import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = db
        .from('service_orders')
        .select('*, customers(name, phone), technicians(name)', { count: 'exact' })
        .eq('company_id', user.company_id)
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
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const body = await req.json()

    // Generate order number based on the highest existing one
    const { data: lastOS } = await db
        .from('service_orders')
        .select('order_number')
        .eq('company_id', user.company_id)
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

    const { data, error } = await db
        .from('service_orders')
        .insert({
            company_id: user.company_id,
            order_number: orderNumber,
            customer_id: body.customer_id || null,
            technician_id: body.technician_id || null,
            service_type_id: body.service_type_id || null,
            status: body.status || 'aberta',
            priority: body.priority || 'normal',
            title: body.title,
            description: body.description,
            problem_description: body.problem_description,
            equipment_description: body.equipment_description,
            equipment_serial: body.equipment_serial,
            estimated_time_minutes: body.estimated_time_minutes || null,
            estimated_cost: body.estimated_cost || 0,
            parts_cost: body.parts_cost || 0,
            labor_cost: body.labor_cost || 0,
            scheduled_date: body.scheduled_date,
            internal_notes: body.internal_notes,
            warranty_months: body.warranty_months || 0,
            device_condition: body.device_condition || null,
            turns_on: body.turns_on ?? true,
            photo_front_url: body.photo_front_url || null,
            photo_back_url: body.photo_back_url || null,
            created_by: user.id,
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log history
    await db.from('service_order_history').insert({
        service_order_id: data.id,
        changed_by: user.id,
        changed_by_name: 'Sistema',
        field_name: 'status',
        new_value: body.status || 'aberta',
        change_reason: 'OS criada',
    })

    return NextResponse.json(data, { status: 201 })
}
