import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatWhatsApp } from './phone'

/** Finds (or creates) the WhatsApp conversation for a phone number, for a given company. */
export async function findOrCreateWhatsAppConversation(db: SupabaseClient, companyId: string, phone: string, name: string | null, customerId: string | null) {
    const find = () => db.from('alice_conversations').select('id, mode, unread_count, customer_name').eq('company_id', companyId).eq('channel', 'whatsapp').eq('customer_phone', phone).maybeSingle()
    const { data: existing } = await find()
    if (existing) return { ...existing, isNew: false }
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
