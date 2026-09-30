import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError, TASK_SELECT } from '@/lib/tasks/access'
import { updateTaskSchema, firstError } from '@/lib/tasks/schemas'
import { resolveToday, addDays, diffDays } from '@/lib/tasks/dates'
import { nextOccurrence } from '@/lib/tasks/recurrence'
import type { Recurrence, Subtask } from '@/lib/tasks/types'

type P = { params: Promise<{ id: string }> }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PATCH /api/tasks/:id?today=YYYY-MM-DD
 * Updates fields; `status: 'done'` completes the task and, for recurring
 * tasks, schedules the next occurrence.
 */
export async function PATCH(req: NextRequest, { params }: P) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId, dbUser } = ctx
    const { id } = await params
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

    const today = resolveToday(new URL(req.url).searchParams.get('today'))
    const body = await req.json().catch(() => null)
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })

    const { data: current, error: findError } = await db
        .from('tasks')
        .select(TASK_SELECT)
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()
    if (findError) return dbError(findError)
    if (!current) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

    const { reminders, ...fields } = parsed.data
    const update: Record<string, unknown> = { ...fields }

    const completing = fields.status === 'done' && current.status !== 'done'
    const reopening = fields.status === 'open' && current.status === 'done'
    if (completing) update.completed_at = new Date().toISOString()
    if (reopening) update.completed_at = null
    // Moving a task to another day resets its "postponed" counter.
    if (fields.do_date !== undefined && fields.do_date !== current.do_date && !completing) update.rollover_count = 0

    const { error: updateError } = await db.from('tasks').update(update).eq('id', id).eq('company_id', companyId)
    if (updateError) return dbError(updateError)

    if (reminders) {
        await db.from('task_reminders').delete().eq('task_id', id).is('sent_at', null)
        if (reminders.length) {
            const { error: remError } = await db.from('task_reminders').insert(
                reminders.map(remind_at => ({ company_id: companyId, task_id: id, remind_at }))
            )
            if (remError) return dbError(remError)
        }
    }

    let next = null
    if (completing) {
        // A task created from a module alert keeps that alert quiet for a few
        // days; if the underlying problem persists, the alert comes back.
        if (current.source_key) {
            await db.from('task_alert_states').upsert({
                company_id: companyId,
                alert_key: current.source_key,
                snoozed_until: addDays(today, 3),
                dismissed_at: null,
                updated_at: new Date().toISOString(),
            })
        }

        const rule = (fields.recurrence !== undefined ? fields.recurrence : current.recurrence) as Recurrence | null
        if (rule) {
            const base = current.do_date ?? today
            let nextDate = nextOccurrence(rule, base)
            // Never schedule the next occurrence in the past.
            while (nextDate < today) nextDate = nextOccurrence(rule, nextDate)
            const shift = diffDays(base, nextDate)
            const seriesId = current.series_id ?? current.id

            const { data: created, error: nextError } = await db
                .from('tasks')
                .insert({
                    company_id: companyId,
                    user_id: current.user_id ?? dbUser.id,
                    title: fields.title ?? current.title,
                    notes: fields.notes !== undefined ? fields.notes : current.notes,
                    priority: fields.priority ?? current.priority,
                    do_date: nextDate,
                    day_period: fields.day_period !== undefined ? fields.day_period : current.day_period,
                    do_time: fields.do_time !== undefined ? fields.do_time : current.do_time,
                    duration_minutes: fields.duration_minutes !== undefined ? fields.duration_minutes : current.duration_minutes,
                    deadline: current.deadline ? addDays(current.deadline, shift) : null,
                    subtasks: ((fields.subtasks ?? current.subtasks) as Subtask[]).map(s => ({ ...s, done: false })),
                    recurrence: rule,
                    series_id: seriesId,
                })
                .select('id')
                .single()
            if (nextError) return dbError(nextError)
            if (!current.series_id) await db.from('tasks').update({ series_id: seriesId }).eq('id', id)

            // Carry reminders over, shifted by the same number of days.
            const sourceReminders = (current.task_reminders ?? []) as { remind_at: string }[]
            if (sourceReminders.length) {
                await db.from('task_reminders').insert(sourceReminders.map(r => ({
                    company_id: companyId,
                    task_id: created.id,
                    remind_at: new Date(new Date(r.remind_at).getTime() + shift * 86_400_000).toISOString(),
                })))
            }
            const { data: nextFull } = await db.from('tasks').select(TASK_SELECT).eq('id', created.id).single()
            next = nextFull
        }
    }

    const { data: updated, error: readError } = await db.from('tasks').select(TASK_SELECT).eq('id', id).single()
    if (readError) return dbError(readError)
    return NextResponse.json({ task: updated, next })
}

export async function DELETE(_req: NextRequest, { params }: P) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId } = ctx
    const { id } = await params
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

    const { error } = await db.from('tasks').delete().eq('id', id).eq('company_id', companyId)
    if (error) return dbError(error)
    return NextResponse.json({ success: true })
}
