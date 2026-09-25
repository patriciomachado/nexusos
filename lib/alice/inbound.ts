import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { aliceConfigured, DEFAULT_SETTINGS, monthlyUsage, withPlan, type AliceSettings } from './config'
import { getCompanyPlan } from '@/lib/plan-server'
import { runAlice, saveMessage } from './agent'
import { downloadMedia, markReadAndTyping, sendText, type IncomingMessage } from './whatsapp'
import { transcribe, transcriptionConfigured, audioFilename } from './transcribe'
import { digitsOnly, formatWhatsApp, phoneKey, samePhone } from './phone'
import { pushToCompany } from '@/lib/tasks/reminders'

/** Wait for a burst of messages ("oi" / "tudo bem?" / "meu celular...") to finish before answering once. */
const DEBOUNCE_MS = 3000

async function findCustomers(db: SupabaseClient, companyId: string, phone: string) {
    const key = phoneKey(phone)
    if (!key) return []
    const { data } = await db
        .from('customers')
        .select('id, name, phone')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .ilike('phone', `%${key.slice(-4)}%`)
        .limit(50)
    return (data ?? []).filter(c => samePhone(c.phone, phone))
}

async function conversationFor(db: SupabaseClient, companyId: string, phone: string, name: string | null, customerId: string | null) {
    const find = () => db.from('alice_conversations').select('id, mode, unread_count, customer_name').eq('company_id', companyId).eq('channel', 'whatsapp').eq('customer_phone', phone).maybeSingle()
    const { data: existing } = await find()
    if (existing) return existing
    const { data, error } = await db
        .from('alice_conversations')
        .insert({ company_id: companyId, channel: 'whatsapp', customer_phone: phone, customer_name: name, customer_id: customerId, title: name ?? formatWhatsApp(phone) })
        .select('id, mode, unread_count, customer_name')
        .single()
    if (data) return data
    // Two webhooks raced to create it: use the one that won.
    if (error?.code === '23505') return (await find()).data!
    throw error
}

async function tellStaff(db: SupabaseClient, companyId: string, conversationId: string, who: string, text: string) {
    await pushToCompany(db, companyId, {
        title: `WhatsApp · ${who}`,
        body: text.slice(0, 180),
        url: `/alice?conversa=${conversationId}`,
        tag: `alice-${conversationId}`,
    }).catch(err => console.error('[alice] push failed:', err))
}

/** Handles one incoming WhatsApp message end to end (runs after the webhook answered Meta). */
export async function handleIncoming(db: SupabaseClient, msg: IncomingMessage) {
    const { data: settingsRow } = await db
        .from('alice_settings')
        .select('*')
        .eq('whatsapp_phone_number_id', msg.phoneNumberId)
        .maybeSingle()
    if (!settingsRow) return
    const settings = withPlan({ ...DEFAULT_SETTINGS, ...settingsRow } as AliceSettings, await getCompanyPlan(db, settingsRow.company_id))
    if (!settings.whatsapp_enabled || !settings.whatsapp_access_token) return
    const token = settings.whatsapp_access_token
    const companyId = settings.company_id
    const phone = digitsOnly(msg.from)

    const customers = await findCustomers(db, companyId, phone)
    const knownName = customers[0]?.name ?? null
    const conv = await conversationFor(db, companyId, phone, knownName ?? msg.profileName, customers[0]?.id ?? null)
    const who = conv.customer_name || knownName || msg.profileName || formatWhatsApp(phone)

    // Text, transcribed audio, or a note about media Alice can't read.
    let text = msg.text
    let transcribed = false
    if (!text && msg.mediaId && transcriptionConfigured()) {
        try {
            const media = await downloadMedia(token, msg.mediaId)
            text = await transcribe(media.blob, audioFilename(media.mime))
            transcribed = !!text
        } catch (err) {
            console.error('[alice] audio transcription failed:', err)
        }
    }
    const display = text ?? `[${msg.type === 'image' ? 'imagem' : msg.type === 'audio' ? 'áudio' : msg.type === 'document' ? 'documento' : msg.type === 'sticker' ? 'figurinha' : msg.type === 'video' ? 'vídeo' : msg.type === 'location' ? 'localização' : 'mensagem'} sem texto]`

    try {
        await saveMessage(db, {
            conversationId: conv.id,
            companyId,
            role: 'user',
            content: [{ type: 'text', text: transcribed ? `(áudio transcrito) ${text}` : text ?? `O cliente enviou ${display} que não pode ser lido aqui.` }],
            text: transcribed ? `🎤 ${text}` : display,
            waMessageId: msg.id,
        })
    } catch (err) {
        if ((err as { code?: string }).code === '23505') return // Meta retried a message we already have
        throw err
    }
    await db.from('alice_conversations').update({
        last_customer_message_at: new Date(msg.timestamp || Date.now()).toISOString(),
        unread_count: (conv.unread_count ?? 0) + 1,
        ...(conv.customer_name ? {} : { customer_name: who }),
    }).eq('id', conv.id)

    // A person is handling this chat: just let them know.
    if (conv.mode === 'human') {
        await tellStaff(db, companyId, conv.id, who, display)
        return
    }

    await markReadAndTyping(token, msg.phoneNumberId, msg.id)

    // Answer once per burst: only the latest message's handler replies.
    await new Promise(r => setTimeout(r, DEBOUNCE_MS))
    const { data: latest } = await db
        .from('alice_messages')
        .select('wa_message_id')
        .eq('conversation_id', conv.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (latest?.wa_message_id !== msg.id) return

    const { data: fresh } = await db.from('alice_conversations').select('mode').eq('id', conv.id).single()
    if (fresh?.mode === 'human') return

    if (!aliceConfigured() || await monthlyUsage(db, companyId) >= settings.monthly_limit) {
        await db.from('alice_conversations').update({ mode: 'human' }).eq('id', conv.id)
        await tellStaff(db, companyId, conv.id, who, `${display} (a Alice está sem crédito/limite; responda pelo app)`)
        return
    }

    const { data: company } = await db.from('companies').select('name').eq('id', companyId).single()
    let reply = ''
    try {
        reply = await runAlice({
            ctx: {
                db,
                companyId,
                channel: 'whatsapp',
                conversationId: conv.id,
                customer: { phone, name: who, customerIds: customers.map(c => c.id) },
            },
            storeName: company?.name ?? 'a loja',
        })
    } catch (err) {
        console.error('[alice] whatsapp agent failed:', err)
        await db.from('alice_conversations').update({ mode: 'human' }).eq('id', conv.id)
        await tellStaff(db, companyId, conv.id, who, `${display} (a Alice não conseguiu responder; responda pelo app)`)
        return
    }
    if (!reply) return
    try {
        await sendText(token, msg.phoneNumberId, phone, reply)
    } catch (err) {
        console.error('[alice] whatsapp send failed:', err)
        await saveMessage(db, { conversationId: conv.id, companyId, role: 'event', text: `Falha ao enviar a resposta pelo WhatsApp: ${(err as Error).message}` })
    }
}

/** Staff reply typed on the Alice page. The person takes over the chat. */
export async function sendStaffReply(db: SupabaseClient, settings: AliceSettings, conversation: { id: string; customer_phone: string }, userId: string, text: string) {
    if (!settings.whatsapp_access_token || !settings.whatsapp_phone_number_id) throw new Error('WhatsApp não configurado.')
    await sendText(settings.whatsapp_access_token, settings.whatsapp_phone_number_id, conversation.customer_phone, text)
    await saveMessage(db, { conversationId: conversation.id, companyId: settings.company_id, role: 'staff', text, content: [], authorUserId: userId })
}

