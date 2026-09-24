import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { dateStringInZone, timeInZone } from './dates'

export interface DeliveredReminder {
    reminder_id: string
    task_id: string
    company_id: string
    title: string
    body: string
    url: string
    /** Groups notifications on the device; defaults to the task id. */
    tag?: string
}

let vapidConfigured: boolean | null = null

export function pushConfigured(): boolean {
    if (vapidConfigured !== null) return vapidConfigured
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    if (!pub || !priv) {
        vapidConfigured = false
        return false
    }
    try {
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@nexusos.app', pub, priv)
        vapidConfigured = true
    } catch (error) {
        console.error('[push] invalid VAPID keys:', error)
        vapidConfigured = false
    }
    return vapidConfigured
}

function timeLabel(time: string | null) {
    return time ? ` às ${time.slice(0, 5)}` : ''
}

/**
 * Claims due reminders (atomically, so two callers never send the same one),
 * records them in the notification bell and sends a push to every subscribed
 * device of the company.
 *
 * `companyId` limits the run to one company (in-app polling); omit it for
 * the cron job, which serves every company.
 */
export async function deliverDueReminders(db: SupabaseClient, companyId?: string): Promise<DeliveredReminder[]> {
    const { data: claimed, error } = await db.rpc('claim_due_task_reminders', {
        p_company_id: companyId ?? null,
        p_limit: 200,
    })
    if (error) throw error
    const rows = (claimed || []) as { reminder_id: string; task_id: string; company_id: string }[]
    if (rows.length === 0) return []

    const taskIds = [...new Set(rows.map(r => r.task_id))]
    const { data: tasks } = await db
        .from('tasks')
        .select('id, title, do_time, deadline, priority')
        .in('id', taskIds)
    const taskById = new Map((tasks || []).map(t => [t.id, t]))

    const delivered: DeliveredReminder[] = rows.flatMap(r => {
        const task = taskById.get(r.task_id)
        if (!task) return []
        return [{
            reminder_id: r.reminder_id,
            task_id: r.task_id,
            company_id: r.company_id,
            title: task.title,
            body: `Lembrete de tarefa${timeLabel(task.do_time)}${task.priority === 1 ? ' · urgente' : ''}`,
            url: `/tarefas?task=${r.task_id}`,
        }]
    })

    if (delivered.length > 0) {
        const { error: notifyError } = await db.from('notifications').insert(delivered.map(d => ({
            company_id: d.company_id,
            type: 'push',
            title: d.title,
            message: d.body,
            status: 'pending',
            related_entity_type: 'task',
            related_entity_id: d.task_id,
            sent_at: new Date().toISOString(),
        })))
        // Reminders are already claimed; push still goes out even if the bell insert fails.
        if (notifyError) console.error('[tasks/reminders] could not add to notifications:', notifyError)
        await sendPush(db, delivered)
    }

    return delivered
}

async function sendPush(db: SupabaseClient, reminders: DeliveredReminder[]) {
    if (!pushConfigured()) return
    const companyIds = [...new Set(reminders.map(r => r.company_id))]
    const { data: subs } = await db
        .from('push_subscriptions')
        .select('id, company_id, endpoint, p256dh, auth')
        .in('company_id', companyIds)
    if (!subs?.length) return

    const expired: string[] = []
    const used: string[] = []
    await Promise.all(reminders.flatMap(reminder =>
        subs.filter(s => s.company_id === reminder.company_id).map(async sub => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    JSON.stringify({ title: reminder.title, body: reminder.body, url: reminder.url, tag: reminder.tag ?? `task-${reminder.task_id}` }),
                    { TTL: 60 * 60, urgency: 'high' }
                )
                used.push(sub.id)
            } catch (err) {
                const status = (err as { statusCode?: number }).statusCode
                if (status === 404 || status === 410) expired.push(sub.id)
                else console.error('[push] send failed:', status, (err as Error).message)
            }
        })
    ))

    if (expired.length) await db.from('push_subscriptions').delete().in('id', expired)
    if (used.length) await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).in('id', [...new Set(used)])
}

/** Sends a test notification to one subscription (used right after enabling). */
export async function sendTestPush(sub: { endpoint: string; p256dh: string; auth: string }) {
    if (!pushConfigured()) return false
    await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: 'Lembretes ativados', body: 'Você vai receber os lembretes das suas tarefas aqui.', url: '/tarefas', tag: 'push-test' }),
        { TTL: 60 }
    )
    return true
}

/** How late a routine reminder may still go out (e.g. after a deploy or while offline). */
const ROUTINE_GRACE_MINUTES = 180

/**
 * Sends the "Lembrar às" reminder of routines scheduled for today, once per
 * day, unless the routine is already done. Selection and marking happen in
 * one SQL statement so concurrent callers never send it twice.
 */
export async function deliverRoutineReminders(db: SupabaseClient, companyId?: string): Promise<DeliveredReminder[]> {
    const today = dateStringInZone()
    const now = timeInZone()
    const nowMinutes = +now.slice(0, 2) * 60 + +now.slice(3, 5)
    const earliest = Math.max(0, nowMinutes - ROUTINE_GRACE_MINUTES)
    const earliestTime = `${String(Math.floor(earliest / 60)).padStart(2, '0')}:${String(earliest % 60).padStart(2, '0')}`

    const { data: claimed, error } = await db.rpc('claim_due_routine_reminders', {
        p_company_id: companyId ?? null,
        p_today: today,
        p_from: earliestTime,
        p_to: `${now}:59`,
    })
    if (error) throw error
    const rows = (claimed ?? []) as { routine_id: string; company_id: string; name: string; step_count: number }[]

    const delivered: DeliveredReminder[] = rows.map(r => ({
        reminder_id: r.routine_id,
        task_id: r.routine_id,
        company_id: r.company_id,
        title: r.name,
        body: `Hora da rotina · ${r.step_count} ${r.step_count === 1 ? 'passo' : 'passos'}`,
        url: '/tarefas',
        tag: `routine-${r.routine_id}`,
    }))

    if (delivered.length) {
        const { error: notifyError } = await db.from('notifications').insert(delivered.map(d => ({
            company_id: d.company_id,
            type: 'push',
            title: d.title,
            message: d.body,
            status: 'pending',
            related_entity_type: 'routine',
            related_entity_id: d.task_id,
            sent_at: new Date().toISOString(),
        })))
        if (notifyError) console.error('[tasks/reminders] could not add routine reminder to notifications:', notifyError)
        await sendPush(db, delivered)
    }
    return delivered
}
