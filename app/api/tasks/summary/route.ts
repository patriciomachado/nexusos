import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { collectAlerts, filterAlerts } from '@/lib/tasks/alerts'
import { resolveToday } from '@/lib/tasks/dates'

export const dynamic = 'force-dynamic'

/** Counts for the sidebar badge and the dashboard widget. */
export async function GET(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId } = ctx
    const today = resolveToday(new URL(req.url).searchParams.get('today'))

    const [openRes, statesRes, alerts] = await Promise.all([
        db.from('tasks').select('id, title, do_date, do_time, deadline, priority, source_key')
            .eq('company_id', companyId).eq('status', 'open')
            .or(`do_date.lte.${today},deadline.lte.${today}`)
            .order('priority').order('do_time', { nullsFirst: false })
            .limit(500),
        db.from('task_alert_states').select('alert_key, snoozed_until, dismissed_at').eq('company_id', companyId),
        collectAlerts(db, companyId, today),
    ])
    if (openRes.error) return dbError(openRes.error)
    if (statesRes.error) return dbError(statesRes.error)

    const open = openRes.data ?? []
    const linked = new Set(open.filter(t => t.source_key).map(t => t.source_key as string))
    const visibleAlerts = filterAlerts(alerts, statesRes.data ?? [], linked, today).filter(a => a.date <= today)

    const overdue = open.filter(t => t.deadline && t.deadline < today).length
    const todayCount = open.length

    return NextResponse.json({
        overdue,
        today: todayCount,
        alerts: visibleAlerts.length,
        total: todayCount + visibleAlerts.length,
        top: [
            ...open.slice(0, 5).map(t => ({ kind: 'task' as const, id: t.id, title: t.title, time: t.do_time?.slice(0, 5) ?? null, priority: t.priority, overdue: !!(t.deadline && t.deadline < today) })),
            ...visibleAlerts.filter(a => a.severity === 'high').slice(0, 3).map(a => ({ kind: 'alert' as const, id: a.key, title: a.title, detail: a.detail, href: a.href, module: a.module })),
        ],
    })
}
