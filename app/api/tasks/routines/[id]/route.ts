import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { routineSchema, firstError } from '@/lib/tasks/schemas'

type P = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: P) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId } = ctx
    const { id } = await params

    const body = await req.json().catch(() => null)
    const parsed = routineSchema.partial().safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })

    const { data, error } = await db
        .from('task_routines')
        .update(parsed.data)
        .eq('id', id)
        .eq('company_id', companyId)
        .select('*')
        .maybeSingle()
    if (error) return dbError(error)
    if (!data) return NextResponse.json({ error: 'Rotina não encontrada' }, { status: 404 })
    return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: P) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId } = ctx
    const { id } = await params

    const { error } = await db.from('task_routines').delete().eq('id', id).eq('company_id', companyId)
    if (error) return dbError(error)
    return NextResponse.json({ success: true })
}
