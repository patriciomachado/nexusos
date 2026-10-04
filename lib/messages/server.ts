import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { eventMessage, normalizeAutomations, readyChannel, renderMessage, sendOnce, waPhone, type Automations } from '@/lib/customers/messages'

export async function loadAutomations(db: SupabaseClient, companyId: string): Promise<{ automations: Automations; storeName: string }> {
    const { data } = await db.from('companies').select('name, settings').eq('id', companyId).single()
    return {
        automations: normalizeAutomations((data?.settings as Record<string, unknown> | null)?.automations),
        storeName: data?.name ?? 'loja',
    }
}

export interface EventSendResult {
    sent: boolean
    /** wa.me com o texto pronto, quando o WhatsApp da loja não está conectado. */
    url?: string
    reason?: 'disabled' | 'no_phone' | 'duplicate' | 'failed' | 'not_found'
    text?: string
}

/**
 * Manda a mensagem de um evento (lib/messages/catalog.ts) com o texto que a
 * loja configurou. `manual`: alguém tocou num botão pra mandar, então vai
 * mesmo com o envio automático desligado. Sem WhatsApp conectado, devolve o
 * link wa.me com o mesmo texto (só faz sentido no envio manual). Cada
 * (key, ref) sai uma vez só (customer_messages).
 */
export async function sendEventMessage(db: SupabaseClient, companyId: string, key: string, m: {
    phone: string | null | undefined
    customerId?: string | null
    ref: string
    vars: Record<string, string>
    userId?: string | null
    manual?: boolean
    automations?: Automations
    storeName?: string
    /** Tipo gravado em customer_messages, quando o evento já existia com outro nome (mantém o "manda uma vez só"). */
    kind?: string
}): Promise<EventSendResult> {
    const loaded = m.automations && m.storeName != null ? { automations: m.automations, storeName: m.storeName } : await loadAutomations(db, companyId)
    const config = eventMessage(loaded.automations, key)
    if (!m.manual && !config.auto) return { sent: false, reason: 'disabled' }
    const phone = waPhone(m.phone)
    if (!phone) return { sent: false, reason: 'no_phone' }
    const text = renderMessage(config.text, { loja: loaded.storeName, ...m.vars })

    const alice = await readyChannel(db, companyId)
    if (alice) {
        const r = await sendOnce(db, alice, { companyId, customerId: m.customerId ?? null, phone, kind: m.kind ?? key, ref: m.ref, text, userId: m.userId })
        if (r.sent) return { sent: true, text }
        if (r.duplicate) return { sent: false, reason: 'duplicate', text }
        if (!m.manual) return { sent: false, reason: 'failed', text }
    }
    return { sent: false, url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, text }
}
