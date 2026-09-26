import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { serviceTypeSchema, idSchema } from '@/lib/validations/schemas'

type P = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    if (!isOwner(ctx.role)) return forbiddenResponse()

    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const { db, companyId } = ctx

    const body = await req.json()
    const validation = serviceTypeSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const update = (row: Record<string, unknown>) => db.from('service_types').update(row).eq('id', id).eq('company_id', companyId).select().single()
    let { data, error } = await update(validation.data)
    // Before the 20261003 migration the table has no time column: save the rest.
    if (error && /estimated_time_minutes/.test(error.message)) {
        const rest: Record<string, unknown> = { ...validation.data }
        delete rest.estimated_time_minutes
        ;({ data, error } = await update(rest))
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    if (!isOwner(ctx.role)) return forbiddenResponse()

    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const { db, companyId } = ctx

    const { error } = await db
        .from('service_types')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
