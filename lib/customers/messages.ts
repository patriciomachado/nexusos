import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadSettings, type AliceSettings } from '@/lib/alice/config'
import { channelReady, channelSend } from '@/lib/alice/channel'
import { digitsOnly } from '@/lib/alice/phone'
import { DEFAULT_AUTOMATIONS, fill, normalizeAutomations } from './templates'

export { DEFAULT_AUTOMATIONS, fill, normalizeAutomations }
export type { Automations } from './templates'

export function waPhone(raw: string | null | undefined) {
    let d = digitsOnly(raw)
    if (d.length < 10) return null
    if (d.length <= 11) d = `55${d}`
    return d
}

/**
 * Sends once per (kind, ref): the row in customer_messages is written first
 * as a claim, so a retry or two parallel runs never message twice.
 */
export async function sendOnce(db: SupabaseClient, alice: AliceSettings, m: { companyId: string; customerId: string | null; phone: string; kind: string; ref: string; text: string; userId?: string | null }) {
    const { data: claim, error } = await db.from('customer_messages').insert({
        company_id: m.companyId, customer_id: m.customerId, kind: m.kind, ref: m.ref, text: m.text, status: 'sending', created_by: m.userId ?? null,
    }).select('id').single()
    if (error || !claim) return { sent: false, duplicate: error?.code === '23505' }
    try {
        await channelSend(alice, m.phone, m.text)
        await db.from('customer_messages').update({ status: 'sent' }).eq('id', claim.id)
        return { sent: true }
    } catch (err) {
        await db.from('customer_messages').update({ status: 'failed' }).eq('id', claim.id)
        console.error('[customers] send failed:', err)
        return { sent: false }
    }
}

export async function readyChannel(db: SupabaseClient, companyId: string) {
    try {
        const alice = await loadSettings(db, companyId)
        return !alice.plan_blocked && channelReady(alice) ? alice : null
    } catch {
        return null
    }
}
