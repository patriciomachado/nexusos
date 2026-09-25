import 'server-only'
import crypto from 'crypto'
import type { AliceSettings } from './config'
import { WhatsAppError } from './whatsapp'
import { digitsOnly } from './phone'

/**
 * The store's own WhatsApp number connected by QR code through a gateway,
 * as an alternative to the Meta Cloud API:
 *
 *   Evolution API (open source, runs on your own server or a hosted one)
 *     url + instance name + API key. If EVOLUTION_API_URL / EVOLUTION_API_KEY
 *     are set in the environment, stores only need to scan the QR code.
 *   Z-API (Brazilian hosted service)
 *     instance id + instance token (+ account security token, if enabled).
 *
 * The gateway posts incoming messages to /api/whatsapp/gateway/<secret>.
 */

export type GatewayProvider = 'evolution' | 'zapi'

export type Media =
    | { kind: 'cloud'; id: string }
    | { kind: 'base64'; data: string; mime: string }
    | { kind: 'url'; url: string; mime: string }
    | { kind: 'evolution'; key: Record<string, unknown>; mime: string }

/** One incoming customer message, whatever the provider. */
export interface InboundMessage {
    from: string
    id: string
    timestamp: number
    profileName: string | null
    type: string
    text: string | null
    media: Media | null
    /** Evolution chat id (e.g. 5548...@s.whatsapp.net), for read receipts. */
    chatId?: string
}

export interface GatewayState {
    state: 'connected' | 'qr' | 'connecting' | 'disconnected'
    qr?: string | null
    phone?: string | null
    name?: string | null
}

export function newWebhookSecret() {
    return crypto.randomBytes(24).toString('hex')
}

// ─── Evolution API ────────────────────────────────────────────────────────

/** The app's own WhatsApp server (whatsapp-server/, Baileys) or an Evolution API server. */
function serverUrl() {
    return (process.env.WHATSAPP_QR_SERVER_URL || process.env.EVOLUTION_API_URL || '').trim().replace(/\/$/, '')
}
function serverKey() {
    return (process.env.WHATSAPP_QR_SERVER_KEY || process.env.EVOLUTION_API_KEY || '').trim()
}

function evolutionConfig(s: AliceSettings) {
    // A store's own URL/key (advanced option) wins over the app's server.
    const own = !!s.whatsapp_gateway_url?.trim()
    const url = (own ? s.whatsapp_gateway_url! : serverUrl()).trim().replace(/\/$/, '')
    const key = (own ? s.whatsapp_gateway_token ?? '' : serverKey()).trim()
    const instance = (s.whatsapp_gateway_instance || `nexus-${s.company_id.slice(0, 8)}`).trim()
    return { url, key, instance }
}

/** The app has its own WhatsApp server configured (stores only scan the QR code). */
export function qrServerConfigured() {
    return !!serverUrl() && !!serverKey()
}

async function evolution<T = Record<string, unknown>>(s: AliceSettings, path: string, init?: RequestInit & { allow404?: boolean }): Promise<{ status: number; data: T }> {
    const { url, key } = evolutionConfig(s)
    if (!url || !key) throw new WhatsAppError('O servidor do WhatsApp ainda não foi configurado (WHATSAPP_QR_SERVER_URL e WHATSAPP_QR_SERVER_KEY na Vercel).')
    let res: Response
    try {
        res = await fetch(`${url}${path}`, {
            ...init,
            headers: { apikey: key, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
            signal: AbortSignal.timeout(20_000),
        })
    } catch {
        throw new WhatsAppError(`Não foi possível falar com o servidor do WhatsApp (${url}). Ele está no ar?`)
    }
    const data = await res.json().catch(() => ({})) as T & { message?: unknown; response?: { message?: unknown } }
    if (res.status === 401 || res.status === 403 && /api ?key|unauthori/i.test(JSON.stringify(data))) {
        throw new WhatsAppError('O servidor do WhatsApp recusou a chave. Confira a API key.')
    }
    if (!res.ok && !(init?.allow404 && res.status === 404)) {
        const msg = data.response?.message ?? data.message
        throw new WhatsAppError(`Servidor do WhatsApp: ${Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : `erro ${res.status}`}`, res.status)
    }
    return { status: res.status, data }
}

async function evolutionState(s: AliceSettings): Promise<string | null> {
    const { instance } = evolutionConfig(s)
    const r = await evolution<{ instance?: { state?: string }; state?: string }>(s, `/instance/connectionState/${encodeURIComponent(instance)}`, { allow404: true })
    if (r.status === 404) return null
    return r.data.instance?.state ?? r.data.state ?? 'close'
}

async function evolutionInfo(s: AliceSettings) {
    const { instance } = evolutionConfig(s)
    try {
        const r = await evolution<unknown>(s, `/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`)
        const list = Array.isArray(r.data) ? r.data : [r.data]
        const row = list[0] as { ownerJid?: string; owner?: string; profileName?: string; instance?: { owner?: string; profileName?: string } } | undefined
        const owner = row?.ownerJid ?? row?.owner ?? row?.instance?.owner ?? ''
        return { phone: digitsOnly(owner.split('@')[0]) || null, name: row?.profileName ?? row?.instance?.profileName ?? null }
    } catch {
        return { phone: null, name: null }
    }
}

async function evolutionSetWebhook(s: AliceSettings, webhookUrl: string) {
    const { instance } = evolutionConfig(s)
    const path = `/webhook/set/${encodeURIComponent(instance)}`
    const events = ['MESSAGES_UPSERT']
    try {
        // v2.2+
        await evolution(s, path, { method: 'POST', body: JSON.stringify({ webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: true, events } }) })
    } catch (err) {
        if (err instanceof WhatsAppError && err.code && err.code >= 500) throw err
        // v2.0 / v2.1 / v1
        await evolution(s, path, { method: 'POST', body: JSON.stringify({ enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: true, events }) })
    }
}

async function evolutionQr(s: AliceSettings) {
    const { instance } = evolutionConfig(s)
    const r = await evolution<{ base64?: string; qrcode?: { base64?: string } }>(s, `/instance/connect/${encodeURIComponent(instance)}`)
    const qr = r.data.base64 ?? r.data.qrcode?.base64 ?? null
    return qr && !qr.startsWith('data:') ? `data:image/png;base64,${qr}` : qr
}

// ─── Z-API ────────────────────────────────────────────────────────────────

function zapiBase(s: AliceSettings) {
    const id = s.whatsapp_gateway_instance?.trim()
    const token = s.whatsapp_gateway_token?.trim()
    if (!id || !token) throw new WhatsAppError('Informe o ID e o token da instância da Z-API.')
    const host = (process.env.ZAPI_URL || 'https://api.z-api.io').trim().replace(/\/$/, '')
    return `${host}/instances/${encodeURIComponent(id)}/token/${encodeURIComponent(token)}`
}

async function zapi<T = Record<string, unknown>>(s: AliceSettings, path: string, init?: RequestInit): Promise<T> {
    let res: Response
    try {
        res = await fetch(`${zapiBase(s)}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(s.whatsapp_gateway_client_token ? { 'Client-Token': s.whatsapp_gateway_client_token } : {}),
                ...(init?.headers ?? {}),
            },
            signal: AbortSignal.timeout(20_000),
        })
    } catch (err) {
        if (err instanceof WhatsAppError) throw err
        throw new WhatsAppError('Não foi possível falar com a Z-API. Tente de novo.')
    }
    const data = await res.json().catch(() => ({})) as T & { error?: string; message?: string }
    if (!res.ok) {
        const msg = data.error ?? data.message ?? `erro ${res.status}`
        if (/client-token|not allowed|token/i.test(String(msg))) throw new WhatsAppError(`A Z-API recusou as credenciais (${msg}). Confira ID, token e o token de segurança da conta.`, res.status)
        throw new WhatsAppError(`Z-API: ${msg}`, res.status)
    }
    return data
}

// ─── Connection (admin screen) ────────────────────────────────────────────

/** Makes sure the instance exists, points its webhook at us and returns the QR code if needed. */
export async function gatewayConnect(s: AliceSettings, webhookUrl: string): Promise<GatewayState> {
    if (s.whatsapp_provider === 'evolution') {
        const { instance } = evolutionConfig(s)
        let state = await evolutionState(s)
        if (state === null) {
            await evolution(s, '/instance/create', { method: 'POST', body: JSON.stringify({ instanceName: instance, integration: 'WHATSAPP-BAILEYS', qrcode: true }) })
            state = 'close'
        }
        await evolutionSetWebhook(s, webhookUrl)
        if (state === 'open') return { state: 'connected', ...(await evolutionInfo(s)) }
        return { state: 'qr', qr: await evolutionQr(s) }
    }
    if (s.whatsapp_provider === 'zapi') {
        await zapi(s, '/update-webhook-received', { method: 'PUT', body: JSON.stringify({ value: webhookUrl }) })
        return gatewayStatus(s, true)
    }
    throw new WhatsAppError('Escolha Evolution API ou Z-API.')
}

/** Current connection; with `withQr`, a fresh QR code while not connected. */
export async function gatewayStatus(s: AliceSettings, withQr = false): Promise<GatewayState> {
    if (s.whatsapp_provider === 'evolution') {
        const state = await evolutionState(s)
        if (state === null) return { state: 'disconnected' }
        if (state === 'open') return { state: 'connected', ...(await evolutionInfo(s)) }
        return { state: withQr ? 'qr' : 'connecting', qr: withQr ? await evolutionQr(s) : null }
    }
    if (s.whatsapp_provider === 'zapi') {
        const st = await zapi<{ connected?: boolean }>(s, '/status')
        if (st.connected) {
            const device = await zapi<{ phone?: string; name?: string }>(s, '/device').catch(() => ({} as { phone?: string; name?: string }))
            return { state: 'connected', phone: digitsOnly(device.phone) || null, name: device.name ?? null }
        }
        if (!withQr) return { state: 'connecting' }
        const qr = await zapi<{ value?: string }>(s, '/qr-code/image').catch(() => ({} as { value?: string }))
        const v = qr.value ?? null
        return { state: 'qr', qr: v && !v.startsWith('data:') ? `data:image/png;base64,${v}` : v }
    }
    return { state: 'disconnected' }
}

export async function gatewayLogout(s: AliceSettings) {
    if (s.whatsapp_provider === 'evolution') {
        const { instance } = evolutionConfig(s)
        await evolution(s, `/instance/logout/${encodeURIComponent(instance)}`, { method: 'DELETE', allow404: true }).catch(() => {})
    } else if (s.whatsapp_provider === 'zapi') {
        await zapi(s, '/disconnect').catch(() => {})
    }
}

// ─── Messages ─────────────────────────────────────────────────────────────

export async function gatewaySend(s: AliceSettings, to: string, text: string, chunks: string[]) {
    const number = digitsOnly(to)
    for (const chunk of chunks.length ? chunks : [text]) {
        if (s.whatsapp_provider === 'evolution') {
            const { instance } = evolutionConfig(s)
            const path = `/message/sendText/${encodeURIComponent(instance)}`
            try {
                await evolution(s, path, { method: 'POST', body: JSON.stringify({ number, text: chunk }) })
            } catch (err) {
                // v1 body shape
                if (err instanceof WhatsAppError && err.code === 400) await evolution(s, path, { method: 'POST', body: JSON.stringify({ number, textMessage: { text: chunk } }) })
                else throw err
            }
        } else {
            await zapi(s, '/send-text', { method: 'POST', body: JSON.stringify({ phone: number, message: chunk }) })
        }
    }
}

/** Read receipt (and "typing…" on Evolution) while Alice prepares the answer. Best effort. */
export async function gatewayMarkRead(s: AliceSettings, msg: InboundMessage) {
    try {
        if (s.whatsapp_provider === 'evolution') {
            const { instance } = evolutionConfig(s)
            const jid = msg.chatId ?? `${msg.from}@s.whatsapp.net`
            await evolution(s, `/chat/markMessageAsRead/${encodeURIComponent(instance)}`, { method: 'POST', body: JSON.stringify({ readMessages: [{ remoteJid: jid, fromMe: false, id: msg.id }] }) })
            await evolution(s, `/chat/sendPresence/${encodeURIComponent(instance)}`, { method: 'POST', body: JSON.stringify({ number: msg.from, delay: 4000, presence: 'composing' }) }).catch(() => {})
        } else if (s.whatsapp_provider === 'zapi') {
            await zapi(s, '/read-message', { method: 'POST', body: JSON.stringify({ phone: msg.from, messageId: msg.id }) })
        }
    } catch { /* receipts are cosmetic */ }
}

export async function gatewayDownload(s: AliceSettings, media: Media): Promise<{ blob: Blob; mime: string }> {
    if (media.kind === 'base64') {
        return { blob: new Blob([Buffer.from(media.data, 'base64')], { type: media.mime }), mime: media.mime }
    }
    if (media.kind === 'url') {
        const res = await fetch(media.url, { signal: AbortSignal.timeout(20_000) })
        if (!res.ok) throw new WhatsAppError('Não foi possível baixar o áudio.')
        return { blob: await res.blob(), mime: media.mime || res.headers.get('content-type') || 'audio/ogg' }
    }
    if (media.kind === 'evolution') {
        const { instance } = evolutionConfig(s)
        const r = await evolution<{ base64?: string; mimetype?: string }>(s, `/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`, {
            method: 'POST', body: JSON.stringify({ message: { key: media.key }, convertToMp4: false }),
        })
        if (!r.data.base64) throw new WhatsAppError('A Evolution API não devolveu o áudio.')
        const mime = r.data.mimetype || media.mime
        return { blob: new Blob([Buffer.from(r.data.base64, 'base64')], { type: mime }), mime }
    }
    throw new WhatsAppError('Mídia não suportada.')
}

// ─── Webhook payloads ─────────────────────────────────────────────────────

type EvoMessage = {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string }
    videoMessage?: { caption?: string }
    buttonsResponseMessage?: { selectedDisplayText?: string }
    listResponseMessage?: { title?: string }
    audioMessage?: { mimetype?: string }
    base64?: string
    [k: string]: unknown
}
type EvoData = {
    key?: { remoteJid?: string; remoteJidAlt?: string; senderPn?: string; fromMe?: boolean; id?: string }
    pushName?: string
    message?: EvoMessage
    messageType?: string
    messageTimestamp?: number | string
    senderPn?: string
}

const EVO_TYPES: Record<string, string> = { audioMessage: 'audio', imageMessage: 'image', videoMessage: 'video', documentMessage: 'document', stickerMessage: 'sticker', locationMessage: 'location', conversation: 'text', extendedTextMessage: 'text' }

export function parseEvolution(body: unknown): InboundMessage[] {
    const b = body as { event?: string; data?: EvoData | EvoData[] | { messages?: EvoData[] } }
    const event = String(b?.event ?? '').toLowerCase().replace(/_/g, '.')
    if (event !== 'messages.upsert') return []
    const raw = b.data
    const list: EvoData[] = Array.isArray(raw) ? raw : (raw as { messages?: EvoData[] })?.messages ?? (raw ? [raw as EvoData] : [])
    const out: InboundMessage[] = []
    for (const d of list) {
        const key = d.key
        if (!key?.id || key.fromMe) continue
        let jid = key.remoteJid ?? ''
        if (/@(g\.us|broadcast|newsletter)$/.test(jid) || jid === 'status@broadcast') continue
        if (jid.endsWith('@lid')) jid = key.remoteJidAlt ?? key.senderPn ?? d.senderPn ?? ''
        const from = digitsOnly(jid.split('@')[0])
        if (!from) continue
        const m = d.message ?? {}
        const typeKey = d.messageType ?? Object.keys(m).find(k => k.endsWith('Message') || k === 'conversation') ?? 'unknown'
        const text = m.conversation ?? m.extendedTextMessage?.text ?? m.buttonsResponseMessage?.selectedDisplayText ?? m.listResponseMessage?.title ?? m.imageMessage?.caption ?? m.videoMessage?.caption ?? null
        const mime = m.audioMessage?.mimetype ?? 'audio/ogg'
        const media: Media | null = m.audioMessage
            ? (m.base64 ? { kind: 'base64', data: m.base64, mime } : { kind: 'evolution', key: key as Record<string, unknown>, mime })
            : null
        const ts = Number(d.messageTimestamp)
        out.push({
            from,
            id: key.id,
            timestamp: ts ? (ts < 1e12 ? ts * 1000 : ts) : Date.now(),
            profileName: d.pushName ?? null,
            type: EVO_TYPES[typeKey] ?? typeKey.replace(/Message$/, ''),
            text: text || null,
            media,
            chatId: key.remoteJid,
        })
    }
    return out
}

type ZapiBody = {
    type?: string
    fromMe?: boolean
    isGroup?: boolean
    broadcast?: boolean
    isNewsletter?: boolean
    isStatusReply?: boolean
    phone?: string
    messageId?: string
    momment?: number
    senderName?: string
    chatName?: string
    text?: { message?: string }
    buttonsResponseMessage?: { message?: string }
    listResponseMessage?: { message?: string; title?: string }
    audio?: { audioUrl?: string; mimeType?: string }
    image?: { caption?: string }
    video?: { caption?: string }
    document?: unknown
    sticker?: unknown
    location?: unknown
}

export function parseZapi(body: unknown): InboundMessage[] {
    const b = body as ZapiBody
    if (!b || (b.type && b.type !== 'ReceivedCallback')) return []
    if (b.fromMe || b.isGroup || b.broadcast || b.isNewsletter || b.isStatusReply) return []
    const from = digitsOnly(b.phone)
    if (!from || !b.messageId) return []
    const text = b.text?.message ?? b.buttonsResponseMessage?.message ?? b.listResponseMessage?.message ?? b.listResponseMessage?.title ?? b.image?.caption ?? b.video?.caption ?? null
    const type = b.text ? 'text' : b.audio ? 'audio' : b.image ? 'image' : b.video ? 'video' : b.document ? 'document' : b.sticker ? 'sticker' : b.location ? 'location' : 'unknown'
    return [{
        from,
        id: b.messageId,
        timestamp: b.momment || Date.now(),
        profileName: b.senderName ?? b.chatName ?? null,
        type,
        text: text || null,
        media: b.audio?.audioUrl ? { kind: 'url', url: b.audio.audioUrl, mime: b.audio.mimeType ?? 'audio/ogg' } : null,
    }]
}
