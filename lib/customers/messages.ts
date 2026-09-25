import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadSettings, type AliceSettings } from '@/lib/alice/config'
import { channelReady, channelSend } from '@/lib/alice/channel'
import { digitsOnly } from '@/lib/alice/phone'

export interface Automations {
    birthday: boolean
    birthday_text: string
    review: boolean
    review_days: number
    review_text: string
}

export const DEFAULT_AUTOMATIONS: Automations = {
    birthday: false,
    birthday_text: 'Feliz aniversário, {nome}! 🎉 A equipe da {loja} deseja um ano incrível. Passando aqui para lembrar que você tem 10% de desconto em película e capinha este mês.',
    review: false,
    review_days: 2,
    review_text: 'Oi, {nome}! Tudo certo com o seu {aparelho}? Se puder, conta pra gente como foi o atendimento da {loja} no Google, ajuda muito: {link}',
}

export function normalizeAutomations(raw: unknown): Automations {
    const r = (raw ?? {}) as Partial<Automations>
    return {
        birthday: !!r.birthday,
        birthday_text: typeof r.birthday_text === 'string' && r.birthday_text.trim() ? r.birthday_text.slice(0, 600) : DEFAULT_AUTOMATIONS.birthday_text,
        review: !!r.review,
        review_days: Math.min(Math.max(Math.round(Number(r.review_days) || 2), 1), 30),
        review_text: typeof r.review_text === 'string' && r.review_text.trim() ? r.review_text.slice(0, 600) : DEFAULT_AUTOMATIONS.review_text,
    }
}

export function fill(text: string, vars: Record<string, string>) {
    return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
}

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
export async function sendOnce(db: SupabaseClient, alice: AliceSettings, m: { companyId: string; customerId: string; phone: string; kind: string; ref: string; text: string; userId?: string | null }) {
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
