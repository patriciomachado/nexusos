import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { gatewayContacts } from '../gateway'
import type { AliceSettings } from '../config'
import { digitsOnly, phoneKey } from '../phone'

/** Remembers who wrote to the store (name as WhatsApp shows it). Quiet: contacts are a convenience, never block a message. */
export async function touchContact(db: SupabaseClient, companyId: string, phone: string, pushName: string | null, customerId: string | null) {
    try {
        const { data: existing } = await db.from('alice_wa_contacts').select('id, push_name, customer_id').eq('company_id', companyId).eq('phone', phone).maybeSingle()
        const now = new Date().toISOString()
        if (existing) {
            await db.from('alice_wa_contacts').update({ last_seen_at: now, ...(pushName && pushName !== existing.push_name ? { push_name: pushName } : {}), ...(customerId && !existing.customer_id ? { customer_id: customerId } : {}) }).eq('id', existing.id)
            return { id: existing.id as string, blocked: await isBlocked(db, existing.id) }
        }
        const { data } = await db.from('alice_wa_contacts').insert({ company_id: companyId, phone, push_name: pushName, customer_id: customerId, last_seen_at: now }).select('id').single()
        return { id: (data?.id as string | undefined) ?? '', blocked: false }
    } catch (err) {
        console.error('[alice] contact upsert failed:', err)
        return { id: '', blocked: false }
    }
}

async function isBlocked(db: SupabaseClient, id: string) {
    const { data } = await db.from('alice_wa_contacts').select('blocked').eq('id', id).single()
    return !!data?.blocked
}

/** Is this number on the store's block list (contacts that get no automatic answers or broadcasts)? */
export async function blockedPhones(db: SupabaseClient, companyId: string): Promise<Set<string>> {
    const { data } = await db.from('alice_wa_contacts').select('phone').eq('company_id', companyId).eq('blocked', true)
    return new Set((data ?? []).map(r => phoneKey(r.phone) ?? r.phone))
}

/** Pulls the WhatsApp address book + people who already wrote, links each to a customer by phone. */
export async function syncContacts(db: SupabaseClient, s: AliceSettings) {
    const remote = await gatewayContacts(s)
    const { data: customers } = await db.from('customers').select('id, phone').eq('company_id', s.company_id).eq('is_active', true).not('phone', 'is', null).limit(10000)
    const byKey = new Map<string, string>()
    for (const c of customers ?? []) { const k = phoneKey(c.phone); if (k) byKey.set(k, c.id) }

    const rows = remote
        .map(c => ({ phone: digitsOnly(c.id.split('@')[0]), name: c.name, push_name: c.pushName }))
        .filter(c => c.phone.length >= 10 && c.phone.length <= 15)
        .map(c => ({ company_id: s.company_id, ...c, customer_id: byKey.get(phoneKey(c.phone) ?? '') ?? null }))
    let saved = 0
    for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500)
        const { error } = await db.from('alice_wa_contacts').upsert(chunk, { onConflict: 'company_id,phone', ignoreDuplicates: false })
        if (error) throw error
        saved += chunk.length
    }
    return saved
}
