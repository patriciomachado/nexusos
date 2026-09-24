import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { batchUpdateSchema, firstError } from '@/lib/tasks/schemas'

/** Moves several tasks at once (used by "Planejar meu dia"). */
export async function POST(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId } = ctx

    const body = await req.json().catch(() => null)
    const parsed = batchUpdateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })

    const { ids, patch } = parsed.data
    const update: Record<string, unknown> = { ...patch }
    if (patch.do_date !== undefined) update.rollover_count = 0

    const { error, count } = await db
        .from('tasks')
        .update(update, { count: 'exact' })
        .in('id', ids)
        .eq('company_id', companyId)
        .eq('status', 'open')
    if (error) return dbError(error)
    return NextResponse.json({ updated: count ?? 0 })
}
