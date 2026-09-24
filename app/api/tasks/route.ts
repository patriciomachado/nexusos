import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError, TASK_SELECT } from '@/lib/tasks/access'
import { createTaskSchema, firstError } from '@/lib/tasks/schemas'
import { collectAlerts, filterAlerts } from '@/lib/tasks/alerts'
import { resolveToday, addDays } from '@/lib/tasks/dates'
import type { TasksPayload } from '@/lib/tasks/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks?today=YYYY-MM-DD            → open tasks, alerts, routines
 * GET /api/tasks?view=done&today=YYYY-MM-DD  → tasks completed in the last 60 days
 */
export async function GET(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId } = ctx

    const { searchParams } = new URL(req.url)
    const today = resolveToday(searchParams.get('today'))

    if (searchParams.get('view') === 'done') {
        const since = `${addDays(today, -60)}T00:00:00-03:00`
        const { data, error } = await db
            .from('tasks')
            .select(TASK_SELECT)
            .eq('company_id', companyId)
            .eq('status', 'done')
            .gte('completed_at', since)
            .order('completed_at', { ascending: false })
            .limit(300)
        if (error) return dbError(error)
        return NextResponse.json({ today, tasks: data ?? [] })
    }

    // Unfinished tasks from previous days move to today (Sunsama-style rollover).
    const { data: rolled, error: rollError } = await db.rpc('tasks_rollover', { p_company_id: companyId, p_today: today })
    if (rollError) return dbError(rollError)

    const [tasksRes, statesRes, linkedRes, routinesRes, runsRes, alerts] = await Promise.all([
        db.from('tasks').select(TASK_SELECT).eq('company_id', companyId).eq('status', 'open')
            .order('do_date', { ascending: true, nullsFirst: false })
            .order('do_time', { ascending: true, nullsFirst: false })
            .order('priority', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(1000),
        db.from('task_alert_states').select('alert_key, snoozed_until, dismissed_at').eq('company_id', companyId),
        db.from('tasks').select('source_key').eq('company_id', companyId).eq('status', 'open').not('source_key', 'is', null),
        db.from('task_routines').select('*').eq('company_id', companyId).order('position').order('created_at'),
        db.from('task_routine_runs').select('*').eq('company_id', companyId).gte('run_date', addDays(today, -1)).lte('run_date', addDays(today, 7)),
        collectAlerts(db, companyId, today),
    ])

    const failed = [tasksRes, statesRes, linkedRes, routinesRes, runsRes].find(r => r.error)
    if (failed?.error) return dbError(failed.error)

    const linkedKeys = new Set((linkedRes.data ?? []).map(r => r.source_key as string))
    const payload: TasksPayload = {
        today,
        tasks: tasksRes.data ?? [],
        alerts: filterAlerts(alerts, statesRes.data ?? [], linkedKeys, today),
        routines: routinesRes.data ?? [],
        runs: runsRes.data ?? [],
        rolledOver: typeof rolled === 'number' ? rolled : 0,
    }
    return NextResponse.json(payload)
}

export async function POST(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId, dbUser } = ctx

    const body = await req.json().catch(() => null)
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })

    const { reminders, ...fields } = parsed.data

    const { data: task, error } = await db
        .from('tasks')
        .insert({
            ...fields,
            priority: fields.priority ?? 3,
            company_id: companyId,
            user_id: dbUser.id,
        })
        .select('*')
        .single()
    if (error) return dbError(error)

    if (task.recurrence && !task.series_id) {
        await db.from('tasks').update({ series_id: task.id }).eq('id', task.id)
        task.series_id = task.id
    }

    if (reminders?.length) {
        const { error: remError } = await db.from('task_reminders').insert(
            reminders.map(remind_at => ({ company_id: companyId, task_id: task.id, remind_at }))
        )
        if (remError) return dbError(remError)
    }

    const { data: full } = await db.from('tasks').select(TASK_SELECT).eq('id', task.id).single()
    return NextResponse.json(full ?? task, { status: 201 })
}
