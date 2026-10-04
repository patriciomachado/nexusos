import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readyChannel, fill } from '@/lib/customers/messages'
import type { AliceSettings } from '../config'
import { sendRich, type Attachment } from './media'

type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

/** Next run after `from`, always in the future (a store that was offline for days doesn't get a burst). */
export function nextOccurrence(from: Date, recurrence: Recurrence, now = new Date()): Date | null {
    if (recurrence === 'none') return null
    const next = new Date(from)
    do {
        if (recurrence === 'daily') next.setUTCDate(next.getUTCDate() + 1)
        else if (recurrence === 'weekly') next.setUTCDate(next.getUTCDate() + 7)
        else next.setUTCMonth(next.getUTCMonth() + 1)
    } while (next <= now)
    return next
}

const media = (r: { media_url: string | null; media_type: Attachment['type'] | null; media_name: string | null }): Attachment | null =>
    r.media_url && r.media_type ? { url: r.media_url, type: r.media_type, name: r.media_name } : null

/** Settings of each store, loaded once per run; null when the store can't send right now. */
function channels(db: SupabaseClient) {
    const cache = new Map<string, AliceSettings | null>()
    return async (companyId: string) => {
        if (!cache.has(companyId)) cache.set(companyId, await readyChannel(db, companyId))
        return cache.get(companyId) ?? null
    }
}

/** Sends every scheduled message that is due. Each row is claimed first, so overlapping runs never double-send. */
export async function processScheduled(db: SupabaseClient) {
    const now = new Date()
    // A run that died mid-send left the row "sending": don't guess, mark it so the store can resend on purpose.
    await db.from('alice_scheduled_messages').update({ status: 'failed', last_error: 'Envio interrompido; confira se a mensagem chegou.' })
        .eq('status', 'sending').lt('send_at', new Date(now.getTime() - 15 * 60_000).toISOString())

    const { data: due } = await db.from('alice_scheduled_messages').select('*').eq('status', 'pending').lte('send_at', now.toISOString()).order('send_at').limit(40)
    const channelFor = channels(db)
    let sent = 0
    for (const row of due ?? []) {
        const settings = await channelFor(row.company_id)
        if (!settings) {
            // Not connected: keep it pending for a day, then give up instead of firing a stale message later.
            if (now.getTime() - new Date(row.send_at).getTime() > 24 * 3600_000) {
                await db.from('alice_scheduled_messages').update({ status: 'failed', last_error: 'WhatsApp desconectado no horário do envio.' }).eq('id', row.id).eq('status', 'pending')
            }
            continue
        }
        const { data: claimed } = await db.from('alice_scheduled_messages').update({ status: 'sending' }).eq('id', row.id).eq('status', 'pending').select('id')
        if (!claimed?.length) continue
        try {
            await sendRich(settings, row.target, { text: row.content, media: media(row) })
            const next = nextOccurrence(new Date(row.send_at), row.recurrence as Recurrence)
            await db.from('alice_scheduled_messages').update({
                status: next ? 'pending' : 'sent',
                ...(next ? { send_at: next.toISOString() } : {}),
                last_sent_at: new Date().toISOString(),
                last_error: null,
                sent_count: (row.sent_count ?? 0) + 1,
            }).eq('id', row.id)
            sent++
        } catch (err) {
            const next = nextOccurrence(new Date(row.send_at), row.recurrence as Recurrence)
            await db.from('alice_scheduled_messages').update({
                status: next ? 'pending' : 'failed',
                ...(next ? { send_at: next.toISOString() } : {}),
                last_error: (err as Error).message.slice(0, 300),
            }).eq('id', row.id)
        }
    }
    return sent
}

const firstName = (name: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'tudo bem'

/**
 * Sends broadcast recipients one at a time with a random pause (the anti-ban pacing).
 * `next_send_at` on the broadcast is claimed before each send, so two overlapping runs still keep the pace.
 * Works until `budgetMs` is used up; the next run continues where this one stopped.
 */
export async function processBroadcasts(db: SupabaseClient, budgetMs = 80_000) {
    const deadline = Date.now() + budgetMs
    const channelFor = channels(db)
    let sent = 0

    while (Date.now() < deadline) {
        const nowIso = new Date().toISOString()
        const { data: due } = await db.from('alice_broadcasts').select('*').eq('status', 'running').or(`next_send_at.is.null,next_send_at.lte.${nowIso}`).order('created_at').limit(1)
        const b = due?.[0]
        if (!b) {
            // Nothing due: wait for a pacing window that opens before the deadline, otherwise stop.
            const { data: soon } = await db.from('alice_broadcasts').select('next_send_at').eq('status', 'running').order('next_send_at').limit(1)
            const at = soon?.[0]?.next_send_at ? new Date(soon[0].next_send_at).getTime() : 0
            if (!at || at - Date.now() > deadline - Date.now() - 1500) break
            await new Promise(r => setTimeout(r, Math.max(250, at - Date.now())))
            continue
        }

        const settings = await channelFor(b.company_id)
        if (!settings) {
            // Disconnected: pause instead of marking every recipient failed.
            await db.from('alice_broadcasts').update({ status: 'paused' }).eq('id', b.id).eq('status', 'running')
            continue
        }

        const delay = (b.delay_min_seconds + Math.random() * Math.max(0, b.delay_max_seconds - b.delay_min_seconds)) * 1000
        const { data: paced } = await db.from('alice_broadcasts').update({ next_send_at: new Date(Date.now() + delay).toISOString() }).eq('id', b.id).eq('status', 'running').or(`next_send_at.is.null,next_send_at.lte.${nowIso}`).select('id')
        if (!paced?.length) continue

        const { data: pending } = await db.from('alice_broadcast_recipients').select('id, phone, name').eq('broadcast_id', b.id).eq('status', 'pending').limit(1)
        const r = pending?.[0]
        if (!r) {
            // A run that died mid-send leaves its recipient "sending": after 10 minutes call it failed so the broadcast can finish.
            await db.from('alice_broadcast_recipients').update({ status: 'failed', error: 'Envio interrompido; confira se chegou.' }).eq('broadcast_id', b.id).eq('status', 'sending').lt('sent_at', new Date(Date.now() - 10 * 60_000).toISOString())
            const { count } = await db.from('alice_broadcast_recipients').select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).in('status', ['pending', 'sending'])
            if (!count) await db.from('alice_broadcasts').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', b.id).eq('status', 'running')
            continue
        }
        const { data: claimed } = await db.from('alice_broadcast_recipients').update({ status: 'sending', sent_at: new Date().toISOString() }).eq('id', r.id).eq('status', 'pending').select('id')
        if (!claimed?.length) continue

        let error: string | null = null
        try {
            await sendRich(settings, r.phone, { text: fill(b.message, { nome: firstName(r.name) }), media: media(b) })
        } catch (err) {
            error = (err as Error).message.slice(0, 300)
        }
        await db.from('alice_broadcast_recipients').update({ status: error ? 'failed' : 'sent', error, sent_at: new Date().toISOString() }).eq('id', r.id)
        const [{ count: ok }, { count: bad }, { count: left }] = await Promise.all([
            db.from('alice_broadcast_recipients').select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).eq('status', 'sent'),
            db.from('alice_broadcast_recipients').select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).eq('status', 'failed'),
            db.from('alice_broadcast_recipients').select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).in('status', ['pending', 'sending']),
        ])
        await db.from('alice_broadcasts').update({ sent: ok ?? 0, failed: bad ?? 0, ...(left ? {} : { status: 'completed', completed_at: new Date().toISOString() }) }).eq('id', b.id).neq('status', 'cancelled')
        if (!error) sent++
    }
    return sent
}
