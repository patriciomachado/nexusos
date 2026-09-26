import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { serviceTypeSchema } from '@/lib/validations/schemas'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { data, error } = await db
        .from('service_types')
        .select('*')
        .eq('company_id', companyId)
        .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    if (!isOwner(ctx.role)) return forbiddenResponse()

    const { db, companyId } = ctx
    const body = await req.json()

    const validation = serviceTypeSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const insert = (row: Record<string, unknown>) => db.from('service_types').insert({ ...row, company_id: companyId }).select().single()
    let { data, error } = await insert(validation.data)
    // Before the 20261003 migration the table has no time column: save the rest.
    if (error && /estimated_time_minutes/.test(error.message)) {
        const rest: Record<string, unknown> = { ...validation.data }
        delete rest.estimated_time_minutes
        ;({ data, error } = await insert(rest))
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
