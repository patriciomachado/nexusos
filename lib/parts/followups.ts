import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { appUrl, type AliceSettings } from '@/lib/alice/config'
import { readyChannel, sendOnce, waPhone } from '@/lib/customers/messages'
import { buildFollowUpMessage } from '@/lib/parts/quotes'

/** Horas até cutucar o cliente sobre um orçamento que ainda não virou OS. */
const REMINDER_HOURS = 2
/** Orçamentos mais velhos que isso já viraram 'vencido' na UI; para de checar. */
const MAX_AGE_DAYS = 14

/**
 * Orçamento parado (sem virar OS) há REMINDER_HOURS: manda o lembrete pelo
 * WhatsApp da loja, se estiver conectado. Sem WhatsApp conectado (ou sem
 * telefone do cliente), não cria nada aqui — a mensagem pronta já fica
 * disponível na aba Orçamentos (Peças → Orçamentos) pra copiar ou mandar na
 * mão. Idempotente via customer_messages (kind + ref únicos).
 */
export async function sendStaleQuoteFollowUps(db: SupabaseClient): Promise<number> {
    const cutoff = new Date(Date.now() - REMINDER_HOURS * 3_600_000).toISOString()
    const minCreated = new Date(Date.now() - MAX_AGE_DAYS * 86_400_000).toISOString()
    const { data: quotes, error } = await db
        .from('part_quotes')
        .select('id, company_id, token, device_model, service, customer_phone, valid_until, created_at')
        .is('service_order_id', null)
        .lte('created_at', cutoff)
        .gte('created_at', minCreated)
        .gt('valid_until', new Date().toISOString())
        .limit(200)
    if (error) { console.error('[parts/followups] query failed:', error); return 0 }
    if (!quotes?.length) return 0

    let sent = 0
    const readyByCompany = new Map<string, AliceSettings | null>()
    for (const q of quotes) {
        const phone = waPhone(q.customer_phone)
        if (!phone) continue
        if (!readyByCompany.has(q.company_id)) readyByCompany.set(q.company_id, await readyChannel(db, q.company_id))
        const alice = readyByCompany.get(q.company_id)
        if (!alice) continue

        const link = `${appUrl()}/orcamento/${q.token}`
        const text = buildFollowUpMessage(q.device_model, q.service, link)
        const r = await sendOnce(db, alice, { companyId: q.company_id, customerId: null, phone, kind: 'quote_follow_up', ref: q.id, text })
        if (r.sent) sent++
    }
    return sent
}
