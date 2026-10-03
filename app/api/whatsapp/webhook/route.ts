import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { parseWebhook, validSignature, verifyToken, webhookConfigured } from '@/lib/alice/whatsapp'
import { handleIncoming, settingsForPhoneNumberId } from '@/lib/alice/inbound'

export const maxDuration = 120

/** Meta's one-time verification when the webhook URL is registered. */
export async function GET(req: NextRequest) {
    const p = req.nextUrl.searchParams
    const token = verifyToken()
    if (p.get('hub.mode') === 'subscribe' && token && p.get('hub.verify_token') === token) {
        return new Response(p.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
    return new Response('Forbidden', { status: 403 })
}

/**
 * Incoming WhatsApp messages. The signature proves the call came from Meta;
 * we answer 200 right away (Meta retries slow webhooks) and let Alice work
 * after the response.
 */
export async function POST(req: NextRequest) {
    if (!webhookConfigured()) {
        console.error('[whatsapp] webhook hit but WHATSAPP_APP_SECRET / WHATSAPP_VERIFY_TOKEN are not set')
        return NextResponse.json({ error: 'not configured' }, { status: 503 })
    }
    const raw = await req.text()
    const signature = req.headers.get('x-hub-signature-256')
    if (!validSignature(raw, signature)) {
        // Wrong WHATSAPP_APP_SECRET (it must be the secret of the app that owns the webhook) is the usual cause.
        console.error('[whatsapp] rejected webhook: invalid signature', { hasSignature: !!signature, bytes: raw.length })
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
    let body: unknown
    try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }) }
    const messages = parseWebhook(body)
    if (!messages.length) console.log('[whatsapp] webhook without inbound messages (status/other event)')
    if (messages.length) {
        after(async () => {
            const db = createAdminClient()
            for (const msg of messages) {
                try {
                    const settings = await settingsForPhoneNumberId(db, msg.phoneNumberId)
                    if (!settings) {
                        console.error('[whatsapp] no store uses phone_number_id', msg.phoneNumberId, '(provider must be "cloud" and the id must match the one saved on the Alice page)')
                        continue
                    }
                    await handleIncoming(db, settings, msg)
                } catch (err) {
                    console.error('[whatsapp] failed to handle message', msg.id, err)
                }
            }
        })
    }
    return NextResponse.json({ ok: true })
}
