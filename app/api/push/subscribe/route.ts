import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { pushSubscriptionSchema, firstError } from '@/lib/tasks/schemas'
import { pushConfigured, sendTestPush } from '@/lib/tasks/reminders'

/** Whether push is available on the server. */
export async function GET() {
    const { response } = await requireTaskAccess()
    if (response) return response
    return NextResponse.json({ configured: pushConfigured(), publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null })
}

/** Saves this device's push subscription and sends a confirmation. */
export async function POST(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId, dbUser } = ctx

    if (!pushConfigured()) {
        return NextResponse.json({ error: 'As notificações no celular ainda não foram configuradas no servidor (chaves VAPID).' }, { status: 503 })
    }

    const body = await req.json().catch(() => null)
    const parsed = pushSubscriptionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    const { endpoint, keys } = parsed.data

    const { error } = await db.from('push_subscriptions').upsert({
        company_id: companyId,
        user_id: dbUser.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
    }, { onConflict: 'endpoint' })
    if (error) return dbError(error)

    try {
        await sendTestPush({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
    } catch (err) {
        console.error('[push] test notification failed:', err)
    }
    return NextResponse.json({ ok: true }, { status: 201 })
}

/** Removes this device's subscription. */
export async function DELETE(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const body = await req.json().catch(() => null)
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null
    if (!endpoint) return NextResponse.json({ error: 'Informe o endpoint' }, { status: 400 })

    const { error } = await ctx.db.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('company_id', ctx.companyId)
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
}
