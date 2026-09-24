import { NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { deliverDueReminders } from '@/lib/tasks/reminders'

export const dynamic = 'force-dynamic'

/**
 * Called every minute by the open app. Delivers this company's due reminders
 * (bell + push to every subscribed phone) and returns them so the open tab
 * can show them right away.
 */
export async function POST() {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response

    try {
        const delivered = await deliverDueReminders(ctx.db, ctx.companyId)
        return NextResponse.json({ reminders: delivered.map(({ task_id, title, body, url }) => ({ task_id, title, body, url })) })
    } catch (error) {
        return dbError(error as { message?: string; code?: string })
    }
}
