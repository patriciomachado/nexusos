import 'server-only'
import crypto from 'crypto'

/**
 * Instagram Messaging API (Meta), via Instagram Login — no linked Facebook Page needed.
 *   INSTAGRAM_APP_SECRET    signs incoming webhooks (X-Hub-Signature-256)
 *   INSTAGRAM_VERIFY_TOKEN  answers Meta's webhook verification
 *   INSTAGRAM_GRAPH_VERSION optional, default v23.0
 * Each store saves its Instagram account id and access token on the Alice page —
 * same manual-credential pattern as the WhatsApp Cloud API connection (see whatsapp.ts).
 */

export function graphBase() {
    const host = (process.env.INSTAGRAM_GRAPH_URL || 'https://graph.instagram.com').trim().replace(/\/$/, '')
    return `${host}/${(process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0').trim()}`
}

export function webhookConfigured() {
    return !!process.env.INSTAGRAM_APP_SECRET?.trim() && !!process.env.INSTAGRAM_VERIFY_TOKEN?.trim()
}

export function verifyToken() {
    return process.env.INSTAGRAM_VERIFY_TOKEN?.trim() || ''
}

/** Constant-time check of Meta's HMAC-SHA256 signature over the raw body. */
export function validSignature(rawBody: string, header: string | null) {
    const secret = process.env.INSTAGRAM_APP_SECRET?.trim()
    if (!secret || !header?.startsWith('sha256=')) return false
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex'))
    const received = Buffer.from(header.slice('sha256='.length))
    return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

export class InstagramError extends Error {
    constructor(message: string, public code?: number, public details?: string) { super(message) }
}

type GraphError = { message?: string; code?: number; error_user_msg?: string; error_data?: { details?: string } }

async function graph<T>(token: string, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${graphBase()}/${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    const data = await res.json().catch(() => ({})) as { error?: GraphError } & T
    if (!res.ok) {
        const code = data.error?.code
        const details = [data.error?.error_user_msg, data.error?.error_data?.details].filter(Boolean).join(' ') || undefined
        // 10/200-ish: outside the 24h messaging window, mirrors WhatsApp's 131047.
        if (code === 10 || code === 200) throw new InstagramError('Passaram mais de 24h desde a última mensagem do cliente; o Instagram só permite responder dentro dessa janela (ou com mensagem de modelo aprovada).', code, details)
        if (code === 190 || res.status === 401) throw new InstagramError('Token do Instagram inválido ou expirado.', code, details)
        throw new InstagramError(data.error?.message || `Erro ${res.status} na API do Instagram`, code, details)
    }
    return data
}

export async function sendText(token: string, accountId: string, to: string, text: string) {
    await graph(token, `${accountId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ recipient: { id: to }, message: { text } }),
    })
}

/** Checks the credentials and returns the connected account's display data. */
export async function describeAccount(token: string, accountId: string) {
    return graph<{ username?: string; name?: string }>(token, `${accountId}?fields=username,name`)
}

/**
 * Subscribes this account to the app's webhook so Meta actually starts delivering DM events to it.
 * Unlike the WhatsApp Cloud API (where the embedded setup auto-attaches the webhook to the WABA),
 * each Instagram account must be explicitly subscribed via this endpoint — otherwise GET verification
 * succeeds and credentials validate fine, but no "messages" event ever arrives. Safe to call repeatedly.
 */
export async function subscribeAccount(token: string, accountId: string) {
    await graph(token, `${accountId}/subscribed_apps?subscribed_fields=messages`, { method: 'POST' })
}

/** Best-effort profile lookup for a DM sender, shown as the conversation title. Never blocks the inbound flow. */
export async function describeUser(token: string, igsid: string): Promise<{ username?: string; name?: string } | null> {
    try {
        return await graph<{ username?: string; name?: string }>(token, `${igsid}?fields=username,name`)
    } catch {
        return null
    }
}

// ─── Webhook payload ─────────────────────────────────────────────────────────

export interface IncomingInstagramMessage {
    accountId: string
    from: string
    id: string
    timestamp: number
    text: string | null
}

type WebhookBody = {
    entry?: {
        id?: string
        messaging?: {
            sender?: { id?: string }
            recipient?: { id?: string }
            timestamp?: number
            message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[] }
        }[]
    }[]
}

export function parseWebhook(body: unknown): IncomingInstagramMessage[] {
    const out: IncomingInstagramMessage[] = []
    for (const entry of (body as WebhookBody)?.entry ?? []) {
        // `entry.id` is the connected Instagram account receiving the DM (the recipient side).
        const accountId = entry.id
        if (!accountId) continue
        for (const event of entry.messaging ?? []) {
            const msg = event.message
            // Echoes are the store's own sent messages bounced back; skip them (already saved when sent).
            if (!msg || msg.is_echo || !event.sender?.id) continue
            out.push({
                accountId,
                from: event.sender.id,
                id: msg.mid ?? `${event.sender.id}-${event.timestamp ?? Date.now()}`,
                timestamp: event.timestamp ?? Date.now(),
                text: msg.text ?? null,
            })
        }
    }
    return out
}
