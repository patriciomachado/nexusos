import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { alertActionSchema, firstError } from '@/lib/tasks/schemas'

/**
 * POST /api/tasks/alerts
 *   { key, action: 'snooze', until: 'YYYY-MM-DD' } → hide until that day
 *   { key, action: 'dismiss' }                     → mark as handled
 *   { key, action: 'restore' }                     → undo
 */
export async function POST(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId } = ctx

    const body = await req.json().catch(() => null)
    const parsed = alertActionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    const { key, action, until } = parsed.data

    if (action === 'restore') {
        const { error } = await db.from('task_alert_states').delete().eq('company_id', companyId).eq('alert_key', key)
        if (error) return dbError(error)
        return NextResponse.json({ ok: true })
    }

    if (action === 'snooze' && !until) return NextResponse.json({ error: 'Informe até quando adiar' }, { status: 400 })

    const { error } = await db.from('task_alert_states').upsert({
        company_id: companyId,
        alert_key: key,
        snoozed_until: action === 'snooze' ? until : null,
        dismissed_at: action === 'dismiss' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
    })
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
}
