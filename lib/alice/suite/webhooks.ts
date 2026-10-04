import 'server-only'
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const WEBHOOK_EVENTS = [
    { value: 'message.received', label: 'Mensagem recebida' },
    { value: 'message.sent', label: 'Mensagem enviada (Alice ou equipe)' },
    { value: 'connection.update', label: 'Conexão do WhatsApp mudou' },
    { value: 'conversation.created', label: 'Nova conversa' },
    { value: 'conversation.handoff', label: 'Conversa passou para um humano' },
] as const

export type WebhookEvent = typeof WEBHOOK_EVENTS[number]['value']

/** Blocks webhooks aimed at the server's own network (SSRF) — customers can only point at public https/http hosts. */
export function safeWebhookUrl(raw: string): string | null {
    let u: URL
    try { u = new URL(raw) } catch { return null }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return null
    if (host === '::1' || host.startsWith('[')) return null
    return u.toString()
}

export function sign(secret: string, body: string) {
    return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function deliver(db: SupabaseClient, hook: { id: string; company_id: string; url: string; secret: string | null }, event: string, body: string) {
    let status: number | null = null
    let error: string | null = null
    try {
        const res = await fetch(hook.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Nexus-Event': event,
                ...(hook.secret ? { 'X-Nexus-Signature': `sha256=${sign(hook.secret, body)}` } : {}),
            },
            body,
            redirect: 'manual',
            signal: AbortSignal.timeout(10_000),
        })
        status = res.status
        if (!res.ok) error = `HTTP ${res.status}`
    } catch (err) {
        error = (err as Error).name === 'TimeoutError' ? 'Sem resposta em 10s' : 'Não foi possível conectar'
    }
    await db.from('alice_webhook_logs').insert({ webhook_id: hook.id, company_id: hook.company_id, event, status_code: status, ok: !error, error })
    return { ok: !error, status, error }
}

/** Fire-and-forget fan-out of one event to the store's active webhooks. Never throws. */
export async function dispatchEvent(db: SupabaseClient, companyId: string, event: WebhookEvent, data: Record<string, unknown>) {
    try {
        const { data: hooks } = await db.from('alice_webhooks').select('id, company_id, url, secret').eq('company_id', companyId).eq('enabled', true).contains('events', [event])
        if (!hooks?.length) return
        const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data })
        await Promise.all(hooks.map(h => deliver(db, h, event, body)))
    } catch (err) {
        console.error('[alice] webhook dispatch failed:', err)
    }
}

export async function sendTest(db: SupabaseClient, hook: { id: string; company_id: string; url: string; secret: string | null }) {
    const body = JSON.stringify({ event: 'test', timestamp: new Date().toISOString(), data: { message: 'Teste de webhook da Alice (Nexus OS)' } })
    return deliver(db, hook, 'test', body)
}
