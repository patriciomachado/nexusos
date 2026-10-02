import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ADMIN_ROLES, aliceConfigured, DEFAULT_SETTINGS, monthlyUsage, withPlan, type AliceSettings } from './config'
import { getCompanyPlan } from '@/lib/plan-server'
import { runAlice, saveMessage } from './agent'
import { channelDownload, channelMarkRead, channelReady, channelSend } from './channel'
import type { InboundMessage } from './gateway'
import { transcribe, transcriptionConfigured, audioFilename } from './transcribe'
import { digitsOnly, formatWhatsApp, phoneKey, samePhone } from './phone'
import { findTrustedStaff } from './trusted'
import { pushToCompany } from '@/lib/tasks/reminders'
import { createFunnelEntry } from '@/lib/funnel/entries'
import { isWithinBusinessHours } from './hours'
import { findOrCreateInstagramConversation, findOrCreateWhatsAppConversation } from './conversations'
import * as instagram from './instagram'
import type { IncomingInstagramMessage } from './instagram'

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

/**
 * Bell notification per admin, reused (bumped, not duplicated) while one is already unread for this
 * conversation — otherwise a busy chat would spam the bell with one row per message. Cleared by
 * clearConversationNotifications() once someone opens or replies to the conversation.
 */
async function notifyAdmins(db: SupabaseClient, companyId: string, conversationId: string, title: string, message: string) {
    const { data: admins } = await db.from('users').select('id').eq('company_id', companyId).in('role', ADMIN_ROLES).eq('is_active', true)
    for (const admin of admins ?? []) {
        const { data: bumped } = await db.from('notifications')
            .update({ title, message, status: 'pending', read_at: null, created_at: new Date().toISOString() })
            .eq('company_id', companyId)
            .eq('user_id', admin.id)
            .eq('related_entity_type', 'alice_conversation')
            .eq('related_entity_id', conversationId)
            .neq('status', 'read')
            .select('id')
        if (!bumped?.length) {
            await db.from('notifications').insert({
                company_id: companyId, user_id: admin.id, type: 'push', status: 'pending', title, message,
                related_entity_type: 'alice_conversation', related_entity_id: conversationId,
            })
        }
    }
}

/** Marks the bell notification(s) for this conversation read — call when it's opened or replied to. */
export async function clearConversationNotifications(db: SupabaseClient, companyId: string, conversationId: string) {
    await db.from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('related_entity_type', 'alice_conversation')
        .eq('related_entity_id', conversationId)
        .neq('status', 'read')
}

async function tellStaff(db: SupabaseClient, companyId: string, conversationId: string, who: string, text: string, channelLabel: string = 'WhatsApp') {
    const title = `${channelLabel} · ${who}`
    try {
        await notifyAdmins(db, companyId, conversationId, title, text.slice(0, 500))
    } catch (err) {
        console.error('[alice] notification bell failed:', err)
    }
    await pushToCompany(db, companyId, {
        title,
        body: text.slice(0, 180),
        url: `/alice?conversa=${conversationId}`,
        tag: `alice-${conversationId}`,
    }).catch(err => console.error('[alice] push failed:', err))
}

async function withPlanSettings(db: SupabaseClient, row: Record<string, unknown> | null) {
    if (!row) return null
    return withPlan({ ...DEFAULT_SETTINGS, ...row } as AliceSettings, await getCompanyPlan(db, row.company_id as string))
}

/** Store settings for a Cloud API number. */
export async function settingsForPhoneNumberId(db: SupabaseClient, phoneNumberId: string) {
    const { data } = await db.from('alice_settings').select('*').eq('whatsapp_provider', 'cloud').eq('whatsapp_phone_number_id', phoneNumberId).maybeSingle()
    return withPlanSettings(db, data)
}

/** Store settings for a QR-code connection, found by the secret in its webhook URL. */
export async function settingsForWebhookSecret(db: SupabaseClient, secret: string) {
    const { data } = await db.from('alice_settings').select('*').eq('whatsapp_webhook_secret', secret).maybeSingle()
    return withPlanSettings(db, data)
}

/** Store settings for a connected Instagram professional account. */
export async function settingsForInstagramAccountId(db: SupabaseClient, accountId: string) {
    const { data } = await db.from('alice_settings').select('*').eq('instagram_account_id', accountId).maybeSingle()
    return withPlanSettings(db, data)
}

/** Handles one incoming WhatsApp message end to end (runs after the webhook answered). */
export async function handleIncoming(db: SupabaseClient, settings: AliceSettings, msg: InboundMessage) {
    if (!settings.whatsapp_enabled || !channelReady(settings)) return
    const companyId = settings.company_id
    const phone = digitsOnly(msg.from)

    // A store admin/manager's own WhatsApp, registered in Alice → Configurações: talks to Alice as staff, not a customer.
    const trusted = await findTrustedStaff(db, companyId, phone)
    const customers = trusted ? [] : await findCustomers(db, companyId, phone)
    const knownName = trusted?.name ?? customers[0]?.name ?? null
    const conv = await findOrCreateWhatsAppConversation(db, companyId, phone, knownName ?? msg.profileName, customers[0]?.id ?? null)
    const who = conv.customer_name || knownName || msg.profileName || formatWhatsApp(phone)

    // First-ever message from this number, and not an already-known customer: a new lead for the funil, right away.
    if (conv.isNew && !trusted && !customers.length) {
        await createFunnelEntry(db, {
            companyId,
            title: 'Novo contato pelo WhatsApp',
            leadName: msg.profileName ?? null,
            leadPhone: phone,
            stage: 'lead',
            source: 'whatsapp',
        }).catch(err => console.error('[alice] funil lead failed:', err))
    }

    // Text, transcribed audio, or a note about media Alice can't read.
    let text = msg.text
    let transcribed = false
    if (!text && msg.media && transcriptionConfigured()) {
        try {
            const media = await channelDownload(settings, msg.media)
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

    // Every message notifies, like a normal WhatsApp chat — whether or not Alice ends up answering it.
    // A trusted number talking to Alice isn't a customer writing in, so it's skipped here.
    if (!trusted) await tellStaff(db, companyId, conv.id, who, transcribed ? `🎤 ${text}` : display)

    // A person is handling this chat: the message push above already covers it.
    if (conv.mode === 'human') return

    // Escalation keywords never depend on the model's judgement: a hard rule, checked here.
    const hitKeyword = !trusted && text ? settings.escalation_keywords.find(k => k.trim() && text!.toLowerCase().includes(k.trim().toLowerCase())) : undefined
    if (hitKeyword) {
        await db.from('alice_conversations').update({ mode: 'human' }).eq('id', conv.id)
        const handoff = 'Só um instante, já vou te conectar com alguém da equipe! 🙋'
        try {
            await channelSend(settings, phone, handoff)
            await saveMessage(db, { conversationId: conv.id, companyId, role: 'assistant', content: [{ type: 'text', text: handoff }], text: handoff })
        } catch (err) {
            console.error('[alice] escalation handoff send failed:', err)
        }
        return
    }

    await channelMarkRead(settings, msg)

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

    // Outside the store's configured hours: a canned notice instead of Alice acting like it's open.
    if (!trusted && !isWithinBusinessHours(settings.business_hours)) {
        const closed = settings.business_hours.after_hours_message?.trim() || 'No momento estamos fora do horário de atendimento. Assim que abrirmos, alguém te responde por aqui!'
        try {
            await channelSend(settings, phone, closed)
            await saveMessage(db, { conversationId: conv.id, companyId, role: 'assistant', content: [{ type: 'text', text: closed }], text: closed })
        } catch (err) {
            console.error('[alice] after-hours send failed:', err)
        }
        return
    }

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
                ...(trusted
                    ? { user: trusted }
                    : { customer: { phone, name: who, customerIds: customers.map(c => c.id) } }),
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
        await channelSend(settings, phone, reply)
    } catch (err) {
        console.error('[alice] whatsapp send failed:', err)
        await saveMessage(db, { conversationId: conv.id, companyId, role: 'event', text: `Falha ao enviar a resposta pelo WhatsApp: ${(err as Error).message}` })
    }
}

/** Handles one incoming Instagram DM end to end (runs after the webhook answered). Text-only in v1. */
export async function handleIncomingInstagram(db: SupabaseClient, settings: AliceSettings, msg: IncomingInstagramMessage) {
    if (!settings.instagram_enabled || !settings.instagram_access_token || !settings.instagram_account_id) return
    const companyId = settings.company_id
    const token = settings.instagram_access_token
    const accountId = settings.instagram_account_id
    const igsid = msg.from

    const conv = await findOrCreateInstagramConversation(db, companyId, igsid, null, null)
    let who = conv.customer_name

    if (conv.isNew) {
        const profile = await instagram.describeUser(token, igsid)
        const name = profile?.name || (profile?.username ? `@${profile.username}` : null)
        if (name) {
            await db.from('alice_conversations').update({ customer_name: name, instagram_username: profile?.username ?? null, title: name }).eq('id', conv.id)
            who = name
        }
        await createFunnelEntry(db, {
            companyId,
            title: 'Novo contato pelo Instagram',
            leadName: name,
            source: 'instagram',
        }).catch(err => console.error('[alice] funil lead failed:', err))
    }
    who = who || '@instagram'

    const text = msg.text
    const display = text ?? '[mensagem sem texto]'

    try {
        await saveMessage(db, {
            conversationId: conv.id,
            companyId,
            role: 'user',
            content: [{ type: 'text', text: text ?? `O cliente enviou ${display} que não pode ser lido aqui.` }],
            text: display,
            waMessageId: msg.id,
        })
    } catch (err) {
        if ((err as { code?: string }).code === '23505') return // Meta retried a message we already have
        throw err
    }
    await db.from('alice_conversations').update({
        last_customer_message_at: new Date(msg.timestamp || Date.now()).toISOString(),
        unread_count: (conv.unread_count ?? 0) + 1,
    }).eq('id', conv.id)

    // Every message notifies, like a normal chat — whether or not Alice ends up answering it.
    await tellStaff(db, companyId, conv.id, who, display, 'Instagram')

    // A person is handling this chat: the message push above already covers it.
    if (conv.mode === 'human') return

    // Escalation keywords never depend on the model's judgement: a hard rule, checked here.
    const hitKeyword = text ? settings.escalation_keywords.find(k => k.trim() && text.toLowerCase().includes(k.trim().toLowerCase())) : undefined
    if (hitKeyword) {
        await db.from('alice_conversations').update({ mode: 'human' }).eq('id', conv.id)
        const handoff = 'Só um instante, já vou te conectar com alguém da equipe! 🙋'
        try {
            await instagram.sendText(token, accountId, igsid, handoff)
            await saveMessage(db, { conversationId: conv.id, companyId, role: 'assistant', content: [{ type: 'text', text: handoff }], text: handoff })
        } catch (err) {
            console.error('[alice] instagram escalation handoff send failed:', err)
        }
        return
    }

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

    // Outside the store's configured hours: a canned notice instead of Alice acting like it's open.
    if (!isWithinBusinessHours(settings.business_hours)) {
        const closed = settings.business_hours.after_hours_message?.trim() || 'No momento estamos fora do horário de atendimento. Assim que abrirmos, alguém te responde por aqui!'
        try {
            await instagram.sendText(token, accountId, igsid, closed)
            await saveMessage(db, { conversationId: conv.id, companyId, role: 'assistant', content: [{ type: 'text', text: closed }], text: closed })
        } catch (err) {
            console.error('[alice] instagram after-hours send failed:', err)
        }
        return
    }

    if (!aliceConfigured() || await monthlyUsage(db, companyId) >= settings.monthly_limit) {
        await db.from('alice_conversations').update({ mode: 'human' }).eq('id', conv.id)
        await tellStaff(db, companyId, conv.id, who, `${display} (a Alice está sem crédito/limite; responda pelo app)`, 'Instagram')
        return
    }

    const { data: company } = await db.from('companies').select('name').eq('id', companyId).single()
    let reply = ''
    try {
        reply = await runAlice({
            ctx: {
                db,
                companyId,
                channel: 'instagram',
                conversationId: conv.id,
                customer: { instagramUsername: conv.customer_name ?? undefined, name: who, customerIds: [] },
            },
            storeName: company?.name ?? 'a loja',
        })
    } catch (err) {
        console.error('[alice] instagram agent failed:', err)
        await db.from('alice_conversations').update({ mode: 'human' }).eq('id', conv.id)
        await tellStaff(db, companyId, conv.id, who, `${display} (a Alice não conseguiu responder; responda pelo app)`, 'Instagram')
        return
    }
    if (!reply) return
    try {
        await instagram.sendText(token, accountId, igsid, reply)
    } catch (err) {
        console.error('[alice] instagram send failed:', err)
        await saveMessage(db, { conversationId: conv.id, companyId, role: 'event', text: `Falha ao enviar a resposta pelo Instagram: ${(err as Error).message}` })
    }
}

/** Staff reply typed on the Alice page. The person takes over the chat. */
export async function sendStaffReply(
    db: SupabaseClient,
    settings: AliceSettings,
    conversation: { id: string; channel: 'whatsapp' | 'instagram'; customer_phone: string | null; instagram_id: string | null },
    userId: string,
    text: string,
) {
    if (conversation.channel === 'instagram') {
        if (!settings.instagram_access_token || !settings.instagram_account_id || !conversation.instagram_id) throw new Error('Instagram não configurado.')
        await instagram.sendText(settings.instagram_access_token, settings.instagram_account_id, conversation.instagram_id, text)
    } else {
        if (!channelReady(settings) || !conversation.customer_phone) throw new Error('WhatsApp não configurado.')
        await channelSend(settings, conversation.customer_phone, text)
    }
    await saveMessage(db, { conversationId: conversation.id, companyId: settings.company_id, role: 'staff', text, content: [], authorUserId: userId })
    await clearConversationNotifications(db, settings.company_id, conversation.id).catch(err => console.error('[alice] clear notifications failed:', err))
}

