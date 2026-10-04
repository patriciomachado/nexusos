import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { handleIncoming, settingsForWebhookSecret } from '@/lib/alice/inbound'
import { parseEvolution, parseZapi } from '@/lib/alice/gateway'
import { dispatchEvent } from '@/lib/alice/suite/webhooks'

export const maxDuration = 120

type Params = { params: Promise<{ secret: string }> }

/**
 * Incoming messages from the store's number connected by QR code (our
 * WhatsApp server, Evolution API or Z-API). The secret in the URL tells which
 * store it is; we answer right away and let Alice work after the response.
 */
export async function POST(req: NextRequest, { params }: Params) {
    const { secret } = await params
    if (!/^[a-f0-9]{48}$/.test(secret)) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const body = await req.json().catch(() => null)
    const db = createAdminClient()
    const settings = await settingsForWebhookSecret(db, secret)
    if (!settings) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Connection changes (connected / dropped) are only passed on to the store's own webhooks.
    const ev = body as { event?: string; data?: { state?: string } } | null
    if (ev?.event === 'connection.update') {
        after(() => dispatchEvent(db, settings.company_id, 'connection.update', { state: ev.data?.state ?? 'unknown' }))
        return NextResponse.json({ ok: true })
    }

    const messages = settings.whatsapp_provider === 'zapi' ? parseZapi(body) : settings.whatsapp_provider === 'evolution' ? parseEvolution(body) : []
    if (messages.length) {
        after(async () => {
            for (const msg of messages) {
                try {
                    await handleIncoming(db, settings, msg)
                } catch (err) {
                    console.error('[whatsapp-qr] failed to handle message', msg.id, err)
                }
            }
        })
    }
    return NextResponse.json({ ok: true })
}
