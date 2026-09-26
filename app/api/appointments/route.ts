import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { getLocalDateString } from '@/lib/utils'
import { appointmentSchema, idSchema } from '@/lib/validations/schemas'

/** Without the 20261002 database update the technician is still required. */
function dbError(error: { code?: string; message: string }) {
    if (error.code === '23502' && error.message.includes('technician_id')) {
        return NextResponse.json({ error: 'Escolha o técnico. Para agendar sem técnico, rode a atualização do banco (20261002_produtos_agenda.sql).' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
}

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    
    const { db, companyId } = ctx
    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get('from') || getLocalDateString()
    const dateTo = searchParams.get('to') || getLocalDateString(new Date(Date.now() + 7 * 86400000))

    const { data, error } = await db
        .from('appointments')
        .select('*, technicians(name), customers(name, phone), service_orders(id, title, status, order_number)')
        .eq('company_id', companyId)
        .gte('scheduled_date', dateFrom)
        .lte('scheduled_date', dateTo)
        .order('scheduled_date')
        
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    
    const { db, companyId } = ctx
    const body = await req.json()
    
    const validation = appointmentSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await db
        .from('appointments')
        .insert({ ...validation.data, company_id: companyId })
        .select()
        .single()
        
    if (error) return dbError(error)
    return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    
    const { db, companyId } = ctx
    const body = await req.json()
    const { id, ...updateData } = body
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const validation = appointmentSchema.partial().safeParse(updateData)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await db
        .from('appointments')
        .update(validation.data)
        .eq('id', id)
        .eq('company_id', companyId) // IDOR PROTECTION
        .select()
        .single()
        
    if (error) return dbError(error)
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    
    const { db, companyId } = ctx
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id || !idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido ou ausente' }, { status: 400 })
    }

    const { error } = await db
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId) // IDOR PROTECTION
        
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
