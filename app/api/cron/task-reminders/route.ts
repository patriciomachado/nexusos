import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase'
import { deliverDueReminders, deliverRoutineReminders } from '@/lib/tasks/reminders'

export const dynamic = 'force-dynamic'

function authorized(req: NextRequest) {
    const secret = process.env.CRON_SECRET
    if (!secret) return false
    const header = req.headers.get('authorization') ?? ''
    const expected = `Bearer ${secret}`
    const a = Buffer.from(header)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Delivers due reminders for every company, so phones get notified even when
 * no one has the app open. Call it every minute or few minutes from a
 * scheduler (Vercel Cron on Pro, Supabase pg_cron, or any external cron)
 * with the header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
    if (!authorized(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const db = createAdminClient()
        const tasks = await deliverDueReminders(db)
        const routines = await deliverRoutineReminders(db)
        return NextResponse.json({ delivered: tasks.length + routines.length })
    } catch (error) {
        console.error('[cron/task-reminders] failed:', error)
        return NextResponse.json({ error: 'Falha ao enviar lembretes' }, { status: 500 })
    }
}

export const POST = GET
