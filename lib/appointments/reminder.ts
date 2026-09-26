import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_AUTOMATIONS, fill, normalizeAutomations, readyChannel, sendOnce, waPhone } from '@/lib/customers/messages'

const TZ = 'America/Sao_Paulo'

export interface ReminderAppointment {
    id: string
    scheduled_date: string
    title?: string | null
    customer_id?: string | null
    customers?: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null
}

/** The reminder text for one appointment, from the store's template. */
export function reminderText(template: string, a: ReminderAppointment, store: string) {
    const c = Array.isArray(a.customers) ? a.customers[0] : a.customers
    const when = new Date(a.scheduled_date)
    return fill(template || DEFAULT_AUTOMATIONS.appointment_text, {
        nome: (c?.name ?? '').split(' ')[0],
        loja: store,
        data: when.toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }),
        hora: when.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }),
        servico: a.title ? ` (${a.title})` : '',
    })
}

/**
 * Sends one appointment's reminder from the store's WhatsApp. Without it
 * connected, returns a wa.me link with the same text to send by hand.
 * Each appointment is reminded once (customer_messages); `force` sends again.
 */
export async function remindAppointment(db: SupabaseClient, companyId: string, a: ReminderAppointment, opts: { userId?: string | null; force?: boolean } = {}) {
    const c = Array.isArray(a.customers) ? a.customers[0] : a.customers
    const phone = waPhone(c?.phone)
    if (!phone) return { sent: false, reason: 'no_phone' as const }

    const { data: company } = await db.from('companies').select('name, settings').eq('id', companyId).single()
    const auto = normalizeAutomations((company?.settings as Record<string, unknown> | null)?.automations)
    const text = reminderText(auto.appointment_text, a, company?.name ?? 'loja')

    const alice = await readyChannel(db, companyId)
    if (alice && a.customer_id) {
        const ref = opts.force ? `${a.id}:${Date.now()}` : a.id
        const r = await sendOnce(db, alice, { companyId, customerId: a.customer_id, phone, kind: 'appointment', ref, text, userId: opts.userId })
        if (r.sent || r.duplicate) {
            await db.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', a.id).eq('company_id', companyId)
            return { sent: r.sent, duplicate: !!r.duplicate }
        }
    }
    return { sent: false, url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}` }
}
