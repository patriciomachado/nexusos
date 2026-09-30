import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { routineSchema, firstError } from '@/lib/tasks/schemas'

export async function POST(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId, dbUser } = ctx

    const body = await req.json().catch(() => null)
    const parsed = routineSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })

    const { count } = await db.from('task_routines').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    const { data, error } = await db
        .from('task_routines')
        .insert({ ...parsed.data, company_id: companyId, user_id: dbUser.id, position: count ?? 0 })
        .select('*')
        .single()
    if (error) return dbError(error)
    return NextResponse.json(data, { status: 201 })
}
