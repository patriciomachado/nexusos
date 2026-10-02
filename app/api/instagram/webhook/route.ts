import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { parseWebhook, validSignature, verifyToken, webhookConfigured } from '@/lib/alice/instagram'
import { handleIncomingInstagram, settingsForInstagramAccountId } from '@/lib/alice/inbound'

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
 * Incoming Instagram DMs. The signature proves the call came from Meta; we answer 200 right
 * away (Meta retries slow webhooks) and let Alice work after the response.
 */
export async function POST(req: NextRequest) {
    // TEMP debug (remove once Meta delivery is confirmed working): prove whether Meta is calling at all.
    console.log('[instagram debug] POST received, has-sig:', !!req.headers.get('x-hub-signature-256'), 'configured:', webhookConfigured())
    if (!webhookConfigured()) return NextResponse.json({ error: 'not configured' }, { status: 503 })
    const raw = await req.text()
    const sigOk = validSignature(raw, req.headers.get('x-hub-signature-256'))
    console.log('[instagram debug] sig valid:', sigOk, 'body:', raw.slice(0, 500))
    if (!sigOk) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
    let body: unknown
    try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }) }
    const messages = parseWebhook(body)
    if (messages.length) {
        after(async () => {
            const db = createAdminClient()
            for (const msg of messages) {
                try {
                    const settings = await settingsForInstagramAccountId(db, msg.accountId)
                    if (settings) await handleIncomingInstagram(db, settings, msg)
                } catch (err) {
                    console.error('[instagram] failed to handle message', msg.id, err)
                }
            }
        })
    }
    return NextResponse.json({ ok: true })
}
