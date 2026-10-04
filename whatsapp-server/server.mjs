/**
 * Nexus OS · WhatsApp server (QR code)
 *
 * Keeps each store's WhatsApp number connected with Baileys (the same
 * protocol as WhatsApp Web) and speaks a small subset of the Evolution API,
 * so the app talks to it exactly like it would talk to Evolution:
 *
 *   POST   /instance/create                    { instanceName }
 *   GET    /instance/connectionState/:name
 *   GET    /instance/connect/:name             → QR code (data URL)
 *   GET    /instance/fetchInstances?instanceName=
 *   DELETE /instance/logout/:name
 *   POST   /webhook/set/:name                  { webhook: { url, enabled } } or { url, enabled }
 *   POST   /message/sendText/:name             { number, text }
 *   POST   /chat/markMessageAsRead/:name       { readMessages: [{ remoteJid, id }] }
 *   POST   /chat/sendPresence/:name            { number, presence }
 *   POST   /chat/getBase64FromMediaMessage/:name { message: { key: { id } } }
 *
 * Central de WhatsApp (respostas com mídia, figurinhas, grupos, contatos):
 *   POST   /message/sendMedia/:name            { number, mediatype, media (url|base64), mimetype, fileName, caption }
 *   POST   /message/sendSticker/:name          { number, image (url|base64) }
 *   GET    /group/fetchAll/:name               → grupos em que o número está
 *   GET    /chat/contacts/:name                → contatos vistos (agenda + quem já escreveu)
 *   POST   /chat/checkNumbers/:name            { numbers: [..] } → quais têm WhatsApp
 *   GET    /chat/profilePicture/:name?number=
 *   POST   /instance/settings/:name            { alwaysOnline }
 *
 * `number` aceita telefone (5548999999999) ou o id completo (...@g.us para grupos).
 * Opcional: TICK_URL + TICK_SECRET fazem o servidor chamar o app a cada minuto
 * (agendador e disparos da Alice). Veja LEIA-ME.md.
 *
 * Every request needs the header `apikey: <API_KEY>`.
 * Incoming customer messages are POSTed to the instance webhook as
 * { event: 'messages.upsert', instance, data } (audio included as base64).
 *
 * Env: API_KEY (required), PORT (8080), DATA_DIR (./data, keep it on a volume).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import pino from 'pino'
import QRCode from 'qrcode'
import makeWASocket, { Browsers, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys'

const API_KEY = process.env.API_KEY?.trim()
const PORT = Number(process.env.PORT || 8080)
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data')
if (!API_KEY) {
    console.error('Defina a variável API_KEY (uma senha longa; a mesma vai no app como WHATSAPP_QR_SERVER_KEY).')
    process.exit(1)
}
fs.mkdirSync(DATA_DIR, { recursive: true })

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' })
const NAME_RE = /^[a-zA-Z0-9_-]{2,64}$/

/** name → { sock, state, qr, user, webhook, starting, media } */
const instances = new Map()

const dirOf = name => path.join(DATA_DIR, name)
const webhookFile = name => path.join(dirOf(name), 'webhook.json')
const settingsFile = name => path.join(dirOf(name), 'settings.json')
const contactsFile = name => path.join(dirOf(name), 'contacts.json')

function readWebhook(name) {
    try { return JSON.parse(fs.readFileSync(webhookFile(name), 'utf8')) } catch { return null }
}

function readJsonFile(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

function writeJsonFile(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data))
}

function instanceOf(name) {
    let inst = instances.get(name)
    if (!inst) {
        inst = {
            name, sock: null, state: 'close', qr: null, user: null, webhook: readWebhook(name), starting: null, media: new Map(),
            settings: readJsonFile(settingsFile(name), {}),
            contacts: new Map(Object.entries(readJsonFile(contactsFile(name), {}))),
            contactsDirty: false, presenceTimer: null,
        }
        instances.set(name, inst)
    }
    return inst
}

// ─── Connection ───────────────────────────────────────────────────────────

async function start(inst) {
    if (inst.starting) return inst.starting
    inst.starting = (async () => {
        const { state, saveCreds } = await useMultiFileAuthState(path.join(dirOf(inst.name), 'auth'))
        // The version lookup must never hold up the QR code: give it 5s, then use the one bundled with Baileys.
        const { version } = await Promise.race([
            fetchLatestBaileysVersion().catch(() => ({ version: undefined })),
            new Promise(resolve => setTimeout(() => resolve({ version: undefined }), 5000)),
        ])
        const sock = makeWASocket({
            auth: state,
            version,
            logger,
            browser: Browsers.macOS('Nexus OS'),
            markOnlineOnConnect: inst.settings.alwaysOnline === true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
        })
        inst.sock = sock
        inst.state = 'connecting'

        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('contacts.upsert', list => { for (const c of list) rememberContact(inst, c.id, c.name ?? c.notify ?? c.verifiedName, c.notify) })
        sock.ev.on('contacts.update', list => { for (const c of list) if (c.id) rememberContact(inst, c.id, c.name, c.notify) })
        sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
            if (connection) emit(inst, 'connection.update', { state: connection }).catch(() => {})
            if (qr) {
                inst.qr = await QRCode.toDataURL(qr, { margin: 1, width: 320 })
                inst.state = 'connecting'
            }
            if (connection === 'open') {
                inst.state = 'open'
                inst.qr = null
                inst.user = sock.user ?? null
                console.log(`[${inst.name}] conectado como ${sock.user?.id}`)
                applyPresence(inst)
            }
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode
                inst.sock = null
                inst.starting = null
                if (code === DisconnectReason.loggedOut) {
                    console.log(`[${inst.name}] desconectado pelo celular; apague e leia o QR de novo`)
                    inst.state = 'close'
                    inst.qr = null
                    inst.user = null
                    fs.rmSync(path.join(dirOf(inst.name), 'auth'), { recursive: true, force: true })
                } else {
                    inst.state = 'connecting'
                    setTimeout(() => start(inst).catch(err => console.error(`[${inst.name}] reconexão falhou`, err)), 2000)
                }
            }
        })
        sock.ev.on('messages.upsert', ({ messages, type }) => {
            if (type !== 'notify') return
            for (const msg of messages) forward(inst, msg).catch(err => console.error(`[${inst.name}] webhook falhou`, err.message))
        })
    })()
    try { await inst.starting } catch (err) { inst.starting = null; throw err }
    return inst.starting
}

/** Unwraps ephemeral / view-once containers. */
function content(message) {
    let m = message
    for (let i = 0; i < 4 && m; i++) {
        const inner = m.ephemeralMessage?.message ?? m.viewOnceMessage?.message ?? m.viewOnceMessageV2?.message ?? m.documentWithCaptionMessage?.message
        if (!inner) break
        m = inner
    }
    return m ?? {}
}

const toNumber = v => (v && typeof v === 'object' && typeof v.toNumber === 'function' ? v.toNumber() : Number(v) || 0)

const COMMAND_RE = /^\s*\S{1,3}(figurinha|sticker|s)\b/i

/** Remembers who wrote to us / is in the address book (persisted, small). */
function rememberContact(inst, jid, name, pushName) {
    if (!jid || !/@(s\.whatsapp\.net|lid)$/.test(jid)) return
    const id = jid.replace(/:\d+@/, '@')
    const prev = inst.contacts.get(id) ?? {}
    const next = { ...prev, name: name || prev.name || null, pushName: pushName || prev.pushName || null }
    if (next.name === prev.name && next.pushName === prev.pushName && prev.id) return
    inst.contacts.set(id, { ...next, id })
    inst.contactsDirty = true
}

setInterval(() => {
    for (const inst of instances.values()) {
        if (!inst.contactsDirty) continue
        inst.contactsDirty = false
        try { writeJsonFile(contactsFile(inst.name), Object.fromEntries(inst.contacts)) } catch (err) { console.error(`[${inst.name}] contatos não salvos`, err.message) }
    }
}, 20000).unref()

/** POSTs an event to the instance webhook, retrying a few times on 5xx / network errors. */
async function emit(inst, event, data) {
    const hook = inst.webhook
    if (!hook?.url || hook.enabled === false) return
    const body = JSON.stringify({ event, instance: inst.name, data })
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(hook.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(15000) })
            if (res.ok || res.status < 500) return
        } catch { /* retry */ }
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
}

async function forward(inst, msg) {
    const jid = msg.key?.remoteJid ?? ''
    if (!msg.message || msg.key?.fromMe || /@(broadcast|newsletter)$/.test(jid) || jid === 'status@broadcast') return
    const message = { ...content(msg.message) }
    const messageType = Object.keys(message).find(k => k === 'conversation' || k.endsWith('Message')) ?? 'unknown'
    if (messageType === 'protocolMessage' || messageType === 'reactionMessage') return

    if (!jid.endsWith('@g.us')) rememberContact(inst, jid, null, msg.pushName)

    // Audio is transcribed by the app; an image sent with a sticker command is turned into a sticker.
    const caption = message.imageMessage?.caption ?? message.videoMessage?.caption ?? ''
    const wantsMedia = message.audioMessage || ((message.imageMessage || message.videoMessage) && COMMAND_RE.test(caption))
    if (wantsMedia) {
        try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: inst.sock?.updateMediaMessage })
            message.base64 = buffer.toString('base64')
            if (message.audioMessage) {
                inst.media.set(msg.key.id, { base64: message.base64, mimetype: message.audioMessage.mimetype })
                if (inst.media.size > 50) inst.media.delete(inst.media.keys().next().value)
            }
        } catch (err) {
            console.error(`[${inst.name}] não baixou a mídia`, err.message)
        }
    }

    await emit(inst, 'messages.upsert', { key: msg.key, pushName: msg.pushName ?? null, message, messageType, messageTimestamp: toNumber(msg.messageTimestamp) })
}

async function waitForQrOrOpen(inst, ms = 12000) {
    const until = Date.now() + ms
    while (Date.now() < until && inst.state !== 'open' && !inst.qr) await new Promise(r => setTimeout(r, 250))
}

async function jidFor(inst, number) {
    if (/@(g\.us|s\.whatsapp\.net|lid)$/.test(String(number))) return String(number)
    const digits = String(number).replace(/\D/g, '')
    if (!digits) throw httpError(400, 'number é obrigatório')
    try {
        const [hit] = await inst.sock.onWhatsApp(digits)
        if (hit?.exists && hit.jid) return hit.jid
    } catch { /* fall back */ }
    return `${digits}@s.whatsapp.net`
}

/** "Always online": keeps the number showing as online while the server is connected. */
function applyPresence(inst) {
    if (inst.presenceTimer) { clearInterval(inst.presenceTimer); inst.presenceTimer = null }
    if (inst.settings.alwaysOnline !== true || !inst.sock) return
    const ping = () => inst.sock?.sendPresenceUpdate('available').catch(() => {})
    ping()
    inst.presenceTimer = setInterval(ping, 60000)
    inst.presenceTimer.unref?.()
}

async function mediaBuffer(value) {
    if (typeof value !== 'string' || !value) throw httpError(400, 'media é obrigatório')
    if (/^https?:\/\//.test(value)) {
        const res = await fetch(value, { signal: AbortSignal.timeout(30000) })
        if (!res.ok) throw httpError(400, 'Não foi possível baixar a mídia')
        return { buffer: Buffer.from(await res.arrayBuffer()), mime: res.headers.get('content-type') ?? undefined }
    }
    const m = value.match(/^data:([^;]+);base64,(.*)$/s)
    return { buffer: Buffer.from(m ? m[2] : value, 'base64'), mime: m?.[1] }
}

// ─── HTTP ─────────────────────────────────────────────────────────────────

function httpError(status, message) {
    return Object.assign(new Error(message), { status })
}

function send(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
}

async function readJson(req) {
    const chunks = []
    for await (const c of req) chunks.push(c)
    if (!chunks.length) return {}
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw httpError(400, 'JSON inválido') }
}

function known(name) {
    if (!NAME_RE.test(name)) throw httpError(400, 'Nome de instância inválido')
    if (!instances.has(name) && !fs.existsSync(dirOf(name))) throw httpError(404, 'Instância não existe')
    return instanceOf(name)
}

function connected(inst) {
    if (inst.state !== 'open' || !inst.sock) throw httpError(409, 'WhatsApp não está conectado. Leia o QR Code na tela da Alice.')
    return inst.sock
}

const routes = [
    ['GET', /^\/$/, async () => ({ status: 'ok', instances: instances.size })],

    ['POST', /^\/instance\/create$/, async (_m, body) => {
        const name = String(body.instanceName ?? '')
        if (!NAME_RE.test(name)) throw httpError(400, 'instanceName inválido')
        fs.mkdirSync(dirOf(name), { recursive: true })
        const inst = instanceOf(name)
        start(inst).catch(err => console.error(`[${name}] não iniciou`, err))
        return { instance: { instanceName: name, status: inst.state } }
    }],

    ['GET', /^\/instance\/connectionState\/([^/]+)$/, async ([, name]) => {
        const inst = known(name)
        return { instance: { instanceName: name, state: inst.state } }
    }],

    ['GET', /^\/instance\/connect\/([^/]+)$/, async ([, name]) => {
        const inst = known(name)
        if (!inst.sock) await start(inst)
        await waitForQrOrOpen(inst)
        return { base64: inst.state === 'open' ? null : inst.qr, state: inst.state }
    }],

    ['GET', /^\/instance\/fetchInstances$/, async (_m, _b, url) => {
        const only = url.searchParams.get('instanceName')
        const list = [...instances.values()].filter(i => !only || i.name === only)
        return list.map(i => ({ name: i.name, connectionStatus: i.state, ownerJid: i.user?.id?.replace(/:\d+@/, '@') ?? null, profileName: i.user?.name ?? null }))
    }],

    ['DELETE', /^\/instance\/logout\/([^/]+)$/, async ([, name]) => {
        const inst = known(name)
        try { await inst.sock?.logout() } catch { /* already gone */ }
        inst.sock?.end?.(undefined)
        inst.sock = null
        inst.starting = null
        inst.state = 'close'
        inst.qr = null
        inst.user = null
        fs.rmSync(path.join(dirOf(name), 'auth'), { recursive: true, force: true })
        return { status: 'SUCCESS' }
    }],

    ['POST', /^\/webhook\/set\/([^/]+)$/, async ([, name], body) => {
        const inst = known(name)
        const w = body.webhook ?? body
        if (!w.url || !/^https?:\/\//.test(w.url)) throw httpError(400, 'url do webhook inválida')
        inst.webhook = { url: w.url, enabled: w.enabled !== false }
        fs.mkdirSync(dirOf(name), { recursive: true })
        fs.writeFileSync(webhookFile(name), JSON.stringify(inst.webhook))
        return { webhook: { instanceName: name, ...inst.webhook } }
    }],

    ['POST', /^\/message\/sendText\/([^/]+)$/, async ([, name], body) => {
        const inst = known(name)
        const sock = connected(inst)
        const text = body.text ?? body.textMessage?.text
        if (!text) throw httpError(400, 'text é obrigatório')
        const jid = await jidFor(inst, body.number)
        const sent = await sock.sendMessage(jid, { text: String(text) })
        return { key: sent?.key ?? null, status: 'PENDING' }
    }],

    ['POST', /^\/chat\/markMessageAsRead\/([^/]+)$/, async ([, name], body) => {
        const sock = connected(known(name))
        const keys = (body.readMessages ?? []).map(k => ({ remoteJid: k.remoteJid, id: k.id, fromMe: false }))
        if (keys.length) await sock.readMessages(keys)
        return { message: 'Read messages', read: 'success' }
    }],

    ['POST', /^\/chat\/sendPresence\/([^/]+)$/, async ([, name], body) => {
        const inst = known(name)
        const sock = connected(inst)
        await sock.sendPresenceUpdate(body.presence === 'paused' ? 'paused' : 'composing', await jidFor(inst, body.number))
        return { presence: body.presence ?? 'composing' }
    }],

    ['POST', /^\/message\/sendMedia\/([^/]+)$/, async ([, name], body) => {
        const inst = known(name)
        const sock = connected(inst)
        const jid = await jidFor(inst, body.number)
        const { buffer, mime } = await mediaBuffer(body.media)
        const type = body.mediatype ?? 'document'
        const caption = body.caption ? String(body.caption) : undefined
        const mimetype = body.mimetype || mime
        const payload = type === 'image' ? { image: buffer, caption }
            : type === 'video' ? { video: buffer, caption }
            : type === 'audio' ? { audio: buffer, mimetype: mimetype || 'audio/mpeg', ptt: body.ptt === true }
            : { document: buffer, mimetype: mimetype || 'application/octet-stream', fileName: body.fileName || 'arquivo', caption }
        const sent = await sock.sendMessage(jid, payload)
        return { key: sent?.key ?? null, status: 'PENDING' }
    }],

    ['POST', /^\/message\/sendSticker\/([^/]+)$/, async ([, name], body) => {
        const inst = known(name)
        const sock = connected(inst)
        const jid = await jidFor(inst, body.number)
        const { buffer } = await mediaBuffer(body.image)
        const sticker = await toSticker(buffer)
        const sent = await sock.sendMessage(jid, { sticker })
        return { key: sent?.key ?? null, status: 'PENDING' }
    }],

    ['GET', /^\/group\/fetchAll\/([^/]+)$/, async ([, name]) => {
        const sock = connected(known(name))
        const groups = await sock.groupFetchAllParticipating()
        return Object.values(groups).map(g => ({ id: g.id, subject: g.subject, desc: g.desc ?? null, size: g.size ?? g.participants?.length ?? 0 }))
    }],

    ['GET', /^\/chat\/contacts\/([^/]+)$/, async ([, name]) => {
        const inst = known(name)
        return [...inst.contacts.values()].filter(c => c.id.endsWith('@s.whatsapp.net')).map(c => ({ id: c.id, name: c.name, pushName: c.pushName }))
    }],

    ['POST', /^\/chat\/checkNumbers\/([^/]+)$/, async ([, name], body) => {
        const sock = connected(known(name))
        const numbers = (Array.isArray(body.numbers) ? body.numbers : []).map(n => String(n).replace(/\D/g, '')).filter(Boolean).slice(0, 500)
        const found = numbers.length ? await sock.onWhatsApp(...numbers) : []
        return numbers.map(n => {
            const hit = found.find(f => f.jid?.startsWith(n))
            return { number: n, exists: !!hit?.exists, jid: hit?.jid ?? null }
        })
    }],

    ['GET', /^\/chat\/profilePicture\/([^/]+)$/, async ([, name], _b, url) => {
        const inst = known(name)
        const sock = connected(inst)
        const jid = await jidFor(inst, url.searchParams.get('number') ?? '')
        const picture = await sock.profilePictureUrl(jid, 'preview').catch(() => null)
        return { url: picture }
    }],

    ['POST', /^\/instance\/settings\/([^/]+)$/, async ([, name], body) => {
        const inst = known(name)
        inst.settings = { ...inst.settings, alwaysOnline: body.alwaysOnline === true }
        writeJsonFile(settingsFile(name), inst.settings)
        applyPresence(inst)
        return { settings: inst.settings }
    }],

    ['POST', /^\/chat\/getBase64FromMediaMessage\/([^/]+)$/, async ([, name], body) => {
        const inst = known(name)
        const hit = inst.media.get(body.message?.key?.id)
        if (!hit) throw httpError(404, 'Mídia não encontrada (já expirou)')
        return hit
    }],
]

/** Image/video frame → 512x512 WebP sticker (sharp). */
async function toSticker(buffer) {
    let sharp
    try { sharp = (await import('sharp')).default } catch { throw httpError(501, 'Figurinhas indisponíveis neste servidor (sharp não instalado)') }
    return sharp(buffer, { animated: true })
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer()
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    try {
        if (url.pathname !== '/' && req.headers.apikey !== API_KEY) throw httpError(401, 'apikey inválida')
        for (const [method, re, handler] of routes) {
            const m = url.pathname.match(re)
            if (m && req.method === method) {
                const body = method === 'GET' || method === 'DELETE' ? {} : await readJson(req)
                return send(res, 200, await handler(m.map(decodeURIComponent), body, url))
            }
        }
        send(res, 404, { message: 'Rota não encontrada' })
    } catch (err) {
        if (!err.status) console.error(err)
        send(res, err.status ?? 500, { message: err.message ?? 'Erro' })
    }
})

// Reconnect every store that was already linked before a restart.
for (const name of fs.readdirSync(DATA_DIR)) {
    if (NAME_RE.test(name) && fs.existsSync(path.join(dirOf(name), 'auth', 'creds.json'))) {
        start(instanceOf(name)).catch(err => console.error(`[${name}] não reconectou`, err.message))
    }
}

server.listen(PORT, () => console.log(`WhatsApp server na porta ${PORT} · dados em ${DATA_DIR}`))

// Calls the app every minute so scheduled messages and broadcasts go out on time
// (Vercel cron only runs daily on the free plan). Needs TICK_URL and TICK_SECRET.
const TICK_URL = process.env.TICK_URL?.trim()
const TICK_SECRET = process.env.TICK_SECRET?.trim()
if (TICK_URL && TICK_SECRET) {
    let ticking = false
    setInterval(async () => {
        if (ticking) return
        ticking = true
        try {
            await fetch(TICK_URL, { headers: { authorization: `Bearer ${TICK_SECRET}` }, signal: AbortSignal.timeout(110000) })
        } catch (err) {
            console.error('tick falhou', err.message)
        } finally {
            ticking = false
        }
    }, 60000).unref?.()
    console.log(`Agendador ligado: ${TICK_URL} a cada minuto`)
}
