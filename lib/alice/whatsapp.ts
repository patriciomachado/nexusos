import 'server-only'
import crypto from 'crypto'
import type { InboundMessage } from './gateway'

/**
 * WhatsApp Cloud API (Meta). One Meta app serves every store:
 *   WHATSAPP_APP_SECRET    signs incoming webhooks (X-Hub-Signature-256)
 *   WHATSAPP_VERIFY_TOKEN  answers Meta's webhook verification
 *   WHATSAPP_GRAPH_VERSION optional, default v23.0
 * Each store saves its phone number id and access token on the Alice page.
 */

export function graphBase() {
    const host = (process.env.WHATSAPP_GRAPH_URL || 'https://graph.facebook.com').trim().replace(/\/$/, '')
    return `${host}/${(process.env.WHATSAPP_GRAPH_VERSION || 'v23.0').trim()}`
}

export function webhookConfigured() {
    return !!process.env.WHATSAPP_APP_SECRET?.trim() && !!process.env.WHATSAPP_VERIFY_TOKEN?.trim()
}

export function verifyToken() {
    return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || ''
}

/** Constant-time check of Meta's HMAC-SHA256 signature over the raw body. */
export function validSignature(rawBody: string, header: string | null) {
    const secret = process.env.WHATSAPP_APP_SECRET?.trim()
    if (!secret || !header?.startsWith('sha256=')) return false
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex'))
    const received = Buffer.from(header.slice('sha256='.length))
    return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

export class WhatsAppError extends Error {
    constructor(message: string, public code?: number, public details?: string) { super(message) }
}

type GraphError = { message?: string; code?: number; error_user_msg?: string; error_data?: { details?: string } }

/** Registration errors from Meta, in words the store owner can act on. */
const REGISTER_ERRORS: Record<number, string> = {
    133005: 'PIN incorreto. Este número já tem verificação em duas etapas com outro PIN: use o PIN antigo ou desative/troque o PIN no WhatsApp Manager (Números de telefone → Configurações → Verificação em duas etapas).',
    133006: 'O número ainda não foi verificado. Confirme o código de SMS/ligação na Meta antes de registrar.',
    133008: 'Muitas tentativas de PIN. Aguarde algumas horas e tente de novo.',
    133009: 'Tentativas rápidas demais. Aguarde alguns minutos e tente de novo.',
    133010: 'O número não está registrado na plataforma. Verifique o número na Meta e tente de novo.',
    133015: 'Este número foi removido do app WhatsApp há pouco tempo. Aguarde uns 5 minutos e tente de novo.',
    133016: 'Limite de registros deste número atingido por hoje. Tente amanhã.',
    133000: 'Uma tentativa anterior de descadastrar o número falhou. Descadastre e tente registrar de novo.',
    133004: 'Serviço da Meta indisponível no momento. Tente de novo em alguns minutos.',
    100: 'A Meta recusou os dados enviados (confira a identificação do número e se o PIN tem 6 dígitos).',
    10: 'O token não tem permissão sobre este número. Gere o token com whatsapp_business_management e whatsapp_business_messaging e dê acesso à conta do WhatsApp deste número.',
    200: 'O token não tem permissão sobre este número. Dê ao usuário do sistema acesso à conta do WhatsApp deste número e gere o token de novo.',
}

async function graph<T>(token: string, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${graphBase()}/${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    const data = await res.json().catch(() => ({})) as { error?: GraphError } & T
    if (!res.ok) {
        const code = data.error?.code
        const details = [data.error?.error_user_msg, data.error?.error_data?.details].filter(Boolean).join(' ') || undefined
        if (path.endsWith('/register') && code && REGISTER_ERRORS[code]) throw new WhatsAppError(REGISTER_ERRORS[code], code, details)
        // 131047: outside the 24h customer service window.
        if (code === 131047) throw new WhatsAppError('Passaram mais de 24h desde a última mensagem do cliente; o WhatsApp só permite responder dentro dessa janela.', code)
        if (code === 190 || res.status === 401) throw new WhatsAppError('Token do WhatsApp inválido ou expirado.', code)
        throw new WhatsAppError(data.error?.message || `Erro ${res.status} na API do WhatsApp`, code, details)
    }
    return data
}

export async function sendText(token: string, phoneNumberId: string, to: string, body: string) {
    const chunks = splitMessage(body)
    const ids: string[] = []
    for (const chunk of chunks) {
        const res = await graph<{ messages?: { id: string }[] }>(token, `${phoneNumberId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: true, body: chunk } }),
        })
        if (res.messages?.[0]?.id) ids.push(res.messages[0].id)
    }
    return ids
}

/** Blue ticks + "typing…" indicator while Alice prepares the answer. */
export async function markReadAndTyping(token: string, phoneNumberId: string, messageId: string) {
    try {
        await graph(token, `${phoneNumberId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }),
        })
    } catch {
        // Older API versions reject the typing indicator; the read receipt alone is fine.
        await graph(token, `${phoneNumberId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
        }).catch(() => {})
    }
}

export async function downloadMedia(token: string, mediaId: string): Promise<{ blob: Blob; mime: string }> {
    const meta = await graph<{ url: string; mime_type: string; file_size?: number }>(token, mediaId)
    const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new WhatsAppError('Não foi possível baixar a mídia.')
    return { blob: await res.blob(), mime: meta.mime_type }
}

/** Checks the credentials and returns the number's display data. */
export async function describeNumber(token: string, phoneNumberId: string) {
    return graph<{ display_phone_number?: string; verified_name?: string; quality_rating?: string }>(
        token, `${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
    )
}

/**
 * Registers the number on the Cloud API with its two-step verification PIN
 * (the "Registrar" button in Meta's dashboard, but with the real error).
 */
export async function registerNumber(token: string, phoneNumberId: string, pin: string) {
    await graph(token, `${phoneNumberId}/register`, {
        method: 'POST',
        body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
    })
}

export interface NumberStatus {
    display_phone_number?: string
    verified_name?: string
    code_verification_status?: string
    name_status?: string
    platform_type?: string
    quality_rating?: string
}

/** Where the number stands (verified? name approved? on the Cloud API?). */
export async function numberStatus(token: string, phoneNumberId: string): Promise<NumberStatus> {
    try {
        return await graph<NumberStatus>(token, `${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status,name_status,platform_type,quality_rating`)
    } catch (err) {
        if (err instanceof WhatsAppError && err.code === 100) return describeNumber(token, phoneNumberId)
        throw err
    }
}

/** WhatsApp caps a text at 4096 characters. */
export function splitMessage(text: string, max = 3800) {
    if (text.length <= max) return [text]
    const parts: string[] = []
    let rest = text
    while (rest.length > max) {
        let cut = rest.lastIndexOf('\n', max)
        if (cut < max / 2) cut = rest.lastIndexOf(' ', max)
        if (cut < max / 2) cut = max
        parts.push(rest.slice(0, cut).trim())
        rest = rest.slice(cut).trim()
    }
    if (rest) parts.push(rest)
    return parts
}

// ─── Webhook payload ─────────────────────────────────────────────────────────

/** A Cloud API message: the common inbound shape plus the receiving number id. */
export interface IncomingMessage extends InboundMessage {
    phoneNumberId: string
}

type WebhookBody = {
    entry?: {
        changes?: {
            field?: string
            value?: {
                metadata?: { phone_number_id?: string }
                contacts?: { wa_id?: string; profile?: { name?: string } }[]
                messages?: {
                    from: string; id: string; timestamp: string; type: string
                    text?: { body?: string }
                    audio?: { id?: string }
                    voice?: { id?: string }
                    button?: { text?: string }
                    interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }
                }[]
            }
        }[]
    }[]
}

export function parseWebhook(body: unknown): IncomingMessage[] {
    const out: IncomingMessage[] = []
    for (const entry of (body as WebhookBody)?.entry ?? []) {
        for (const change of entry.changes ?? []) {
            const value = change.value
            const phoneNumberId = value?.metadata?.phone_number_id
            if (!phoneNumberId || !value?.messages) continue
            for (const m of value.messages) {
                const contact = value.contacts?.find(c => c.wa_id === m.from) ?? value.contacts?.[0]
                out.push({
                    phoneNumberId,
                    from: m.from,
                    id: m.id,
                    timestamp: Number(m.timestamp) * 1000,
                    profileName: contact?.profile?.name ?? null,
                    type: m.type,
                    text: m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null,
                    media: (m.audio?.id ?? m.voice?.id) ? { kind: 'cloud', id: (m.audio?.id ?? m.voice?.id)! } : null,
                })
            }
        }
    }
    return out
}
