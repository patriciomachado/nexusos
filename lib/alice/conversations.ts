import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatWhatsApp, phoneKey } from './phone'

/** Finds (or creates) the WhatsApp conversation for a phone number, for a given company. */
export async function findOrCreateWhatsAppConversation(db: SupabaseClient, companyId: string, phone: string, name: string | null, customerId: string | null) {
    const find = () => db.from('alice_conversations').select('id, mode, unread_count, customer_name').eq('company_id', companyId).eq('channel', 'whatsapp').eq('customer_phone', phone).maybeSingle()
    const { data: existing } = await find()
    if (existing) return { ...existing, isNew: false }
    // Same person stored with another format (with/without the mobile "9", country code): reuse that thread instead of opening a second one.
    const key = phoneKey(phone)
    if (key) {
        const { data: candidates } = await db.from('alice_conversations').select('id, mode, unread_count, customer_name, customer_phone, last_message_at').eq('company_id', companyId).eq('channel', 'whatsapp').like('customer_phone', `%${phone.slice(-8)}`).order('last_message_at', { ascending: false })
        const match = candidates?.find(c => phoneKey(c.customer_phone) === key)
        if (match) return { id: match.id, mode: match.mode, unread_count: match.unread_count, customer_name: match.customer_name, isNew: false }
    }
    const { data, error } = await db
        .from('alice_conversations')
        .insert({ company_id: companyId, channel: 'whatsapp', customer_phone: phone, customer_name: name, customer_id: customerId, title: name ?? formatWhatsApp(phone) })
        .select('id, mode, unread_count, customer_name')
        .single()
    if (data) return { ...data, isNew: true }
    // Two callers raced to create it: use the one that won.
    if (error?.code === '23505') return { ...(await find()).data!, isNew: false }
    throw error
}

/** Finds (or creates) the Instagram conversation for a DM sender (IGSID), for a given company. */
export async function findOrCreateInstagramConversation(db: SupabaseClient, companyId: string, instagramId: string, name: string | null, customerId: string | null) {
    const find = () => db.from('alice_conversations').select('id, mode, unread_count, customer_name').eq('company_id', companyId).eq('channel', 'instagram').eq('instagram_id', instagramId).maybeSingle()
    const { data: existing } = await find()
    if (existing) return { ...existing, isNew: false }
    const { data, error } = await db
        .from('alice_conversations')
        .insert({ company_id: companyId, channel: 'instagram', instagram_id: instagramId, instagram_username: name, customer_name: name, customer_id: customerId, title: name })
        .select('id, mode, unread_count, customer_name')
        .single()
    if (data) return { ...data, isNew: true }
    // Two callers raced to create it: use the one that won.
    if (error?.code === '23505') return { ...(await find()).data!, isNew: false }
    throw error
}
