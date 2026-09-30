import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { pushSubscriptionSchema, firstError } from '@/lib/tasks/schemas'
import { pushStatus, sendTestPush, vapidPublicKey } from '@/lib/tasks/reminders'

/** Whether push is available on the server. */
export async function GET() {
    const { response } = await requireTaskAccess()
    if (response) return response
    const status = pushStatus()
    return NextResponse.json({ configured: status.ok, reason: status.reason ?? null, publicKey: status.ok ? vapidPublicKey() : null })
}

/** Saves this device's push subscription and sends a confirmation. */
export async function POST(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId, dbUser } = ctx

    const status = pushStatus()
    if (!status.ok) {
        return NextResponse.json({ error: status.reason ?? 'Notificações não configuradas no servidor.' }, { status: 503 })
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

    const testError = await sendTestPush({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
    return NextResponse.json({ ok: true, testError }, { status: 201 })
}

/** Sends a test notification to this device (PUT { endpoint }). */
export async function PUT(req: NextRequest) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const body = await req.json().catch(() => null)
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null
    if (!endpoint) return NextResponse.json({ error: 'Informe o endpoint' }, { status: 400 })

    const { data: sub, error } = await ctx.db
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('endpoint', endpoint)
        .eq('company_id', ctx.companyId)
        .maybeSingle()
    if (error) return dbError(error)
    if (!sub) return NextResponse.json({ error: 'Este aparelho não está inscrito. Ative os lembretes de novo.' }, { status: 404 })

    const testError = await sendTestPush(sub, 'Teste de notificação')
    if (testError) return NextResponse.json({ error: testError }, { status: 502 })
    return NextResponse.json({ ok: true })
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
