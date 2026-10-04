import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { appUrl } from '@/lib/alice/config'
import { eventMessage, readyChannel, waPhone } from '@/lib/customers/messages'
import { loadAutomations, sendEventMessage } from '@/lib/messages/server'

/** Horas até cutucar o cliente sobre um orçamento que ainda não virou OS. */
const REMINDER_HOURS = 2
/** Orçamentos mais velhos que isso já viraram 'vencido' na UI; para de checar. */
const MAX_AGE_DAYS = 14

/**
 * Orçamento parado (sem virar OS) há REMINDER_HOURS: manda o lembrete pelo
 * WhatsApp da loja, se estiver conectado e a loja não desligou o envio
 * automático (Configurações → Mensagens automáticas). Sem WhatsApp conectado (ou sem
 * telefone do cliente), não cria nada aqui — a mensagem pronta já fica
 * disponível na aba Orçamentos (Peças → Orçamentos) pra copiar ou mandar na
 * mão. Idempotente via customer_messages (kind + ref únicos).
 */
export async function sendStaleQuoteFollowUps(db: SupabaseClient): Promise<number> {
    const cutoff = new Date(Date.now() - REMINDER_HOURS * 3_600_000).toISOString()
    const minCreated = new Date(Date.now() - MAX_AGE_DAYS * 86_400_000).toISOString()
    const { data: quotes, error } = await db
        .from('part_quotes')
        .select('id, company_id, token, device_model, service, customer_name, customer_phone, valid_until, created_at')
        .is('service_order_id', null)
        .lte('created_at', cutoff)
        .gte('created_at', minCreated)
        .gt('valid_until', new Date().toISOString())
        .limit(200)
    if (error) { console.error('[parts/followups] query failed:', error); return 0 }
    if (!quotes?.length) return 0

    let sent = 0
    // Por loja: o texto/ligado de "Lembrete de orçamento parado" e se o WhatsApp está conectado.
    const byCompany = new Map<string, Awaited<ReturnType<typeof loadAutomations>> | null>()
    for (const q of quotes) {
        const phone = waPhone(q.customer_phone)
        if (!phone) continue
        if (!byCompany.has(q.company_id)) {
            const loaded = await loadAutomations(db, q.company_id)
            const on = eventMessage(loaded.automations, 'orcamento_lembrete').auto && !!(await readyChannel(db, q.company_id))
            byCompany.set(q.company_id, on ? loaded : null)
        }
        const loaded = byCompany.get(q.company_id)
        if (!loaded) continue

        const r = await sendEventMessage(db, q.company_id, 'orcamento_lembrete', {
            phone, customerId: null, ref: q.id, kind: 'quote_follow_up',
            automations: loaded.automations, storeName: loaded.storeName,
            vars: {
                nome: (q.customer_name ?? '').split(' ')[0],
                aparelho: q.device_model,
                servico: q.service.toLowerCase(),
                link: `${appUrl()}/orcamento/${q.token}`,
            },
        })
        if (r.sent) sent++
    }
    return sent
}
