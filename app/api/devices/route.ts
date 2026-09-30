import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status')
    const brand = searchParams.get('brand')
    const search = searchParams.get('search')

    try {
        let query = db
            .from('devices')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })

        if (status && status !== 'todos') {
            query = query.eq('status', status)
        }

        if (brand && brand !== 'todas') {
            query = query.ilike('brand', `%${brand}%`)
        }

        if (search) {
            query = query.or(`model.ilike.%${search}%,brand.ilike.%${search}%,imei_1.ilike.%${search}%,imei_2.ilike.%${search}%,serial_number.ilike.%${search}%`)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching devices:', error)
            return NextResponse.json([], { status: 200 })
        }

        return NextResponse.json(data || [])
    } catch (err: any) {
        console.error('Exception fetching devices:', err)
        return NextResponse.json([], { status: 200 })
    }
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const body = await req.json()

    if (!body.brand || !body.model || !body.cash_price) {
        return NextResponse.json({ error: 'Marca, Modelo e Preço à Vista são obrigatórios.' }, { status: 400 })
    }

    try {
        const { data, error } = await db
            .from('devices')
            .insert({
                company_id: companyId,
                user_id: dbUser?.id || null,
                brand: body.brand,
                model: body.model,
                storage: body.storage || null,
                color: body.color || null,
                condition: body.condition || 'seminovo_a',
                battery_health: body.battery_health ? Number(body.battery_health) : 100,
                imei_1: body.imei_1 || null,
                imei_2: body.imei_2 || null,
                serial_number: body.serial_number || null,
                cost_price: Number(body.cost_price || 0),
                cash_price: Number(body.cash_price),
                installment_price: Number(body.installment_price || body.cash_price * 1.12),
                status: body.status || 'disponivel',
                included_items: body.included_items || [],
                images: body.images || [],
                technical_passport: body.technical_passport || {},
                notes: body.notes || null,
                ...(body.extra_costs !== undefined ? { extra_costs: Number(body.extra_costs || 0) } : {}),
                ...(body.test_checklist !== undefined ? { test_checklist: body.test_checklist } : {}),
                ...(body.warranty_months !== undefined ? { warranty_months: Math.max(0, Math.round(Number(body.warranty_months) || 0)) } : {}),
                ...(body.trade_in_id ? { trade_in_id: body.trade_in_id } : {}),
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating device:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (err: any) {
        console.error('Exception creating device:', err)
        return NextResponse.json({ error: err.message || 'Erro ao criar aparelho' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const body = await req.json()

    if (!body.id) {
        return NextResponse.json({ error: 'ID do aparelho é obrigatório.' }, { status: 400 })
    }

    try {
        const updatePayload: any = {
            updated_at: new Date().toISOString()
        }

        if (body.brand !== undefined) updatePayload.brand = body.brand
        if (body.model !== undefined) updatePayload.model = body.model
        if (body.storage !== undefined) updatePayload.storage = body.storage
        if (body.color !== undefined) updatePayload.color = body.color
        if (body.condition !== undefined) updatePayload.condition = body.condition
        if (body.battery_health !== undefined) updatePayload.battery_health = body.battery_health ? Number(body.battery_health) : null
        if (body.imei_1 !== undefined) updatePayload.imei_1 = body.imei_1
        if (body.imei_2 !== undefined) updatePayload.imei_2 = body.imei_2
        if (body.serial_number !== undefined) updatePayload.serial_number = body.serial_number
        if (body.cost_price !== undefined) updatePayload.cost_price = Number(body.cost_price || 0)
        if (body.cash_price !== undefined) updatePayload.cash_price = Number(body.cash_price)
        if (body.installment_price !== undefined) updatePayload.installment_price = Number(body.installment_price)
        if (body.status !== undefined) updatePayload.status = body.status
        if (body.included_items !== undefined) updatePayload.included_items = body.included_items
        if (body.images !== undefined) updatePayload.images = body.images
        if (body.technical_passport !== undefined) updatePayload.technical_passport = body.technical_passport
        if (body.notes !== undefined) updatePayload.notes = body.notes
        if (body.extra_costs !== undefined) updatePayload.extra_costs = Number(body.extra_costs || 0)
        if (body.test_checklist !== undefined) updatePayload.test_checklist = body.test_checklist
        if (body.warranty_months !== undefined) updatePayload.warranty_months = Math.max(0, Math.round(Number(body.warranty_months) || 0))

        const { data, error } = await db
            .from('devices')
            .update(updatePayload)
            .eq('id', body.id)
            .eq('company_id', companyId)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID do aparelho é obrigatório.' }, { status: 400 })

    try {
        const { error } = await ctx.db
            .from('devices')
            .delete()
            .eq('id', id)
            .eq('company_id', ctx.companyId)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
