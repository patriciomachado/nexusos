import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEventMessage, type EventSendResult } from '@/lib/messages/server'
import type { Automations } from '@/lib/customers/messages'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function dayLabel(day: string) {
    const [y, m, d] = day.split('-')
    return `${d}/${m}${y !== String(new Date().getFullYear()) ? `/${y}` : ''}`
}

export interface ChargePayment {
    id: string
    amount: number | string
    due_date: string | null
    notes: string | null
    customer_id?: string | null
    customers?: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null
    service_orders?: { order_number: string | null } | { order_number: string | null }[] | null
}

/**
 * Lembrete de pagamento de uma conta a receber, com o texto de "Lembrete de
 * pagamento" (Configurações → Mensagens automáticas). `manual` é o botão
 * "Cobrar" (manda sempre e pode repetir); sem ele, é o envio automático do
 * dia do vencimento (uma vez por conta).
 */
export async function sendCharge(db: SupabaseClient, companyId: string, p: ChargePayment, opts: { manual?: boolean; userId?: string | null; automations?: Automations; storeName?: string } = {}): Promise<EventSendResult> {
    const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers
    const os = (Array.isArray(p.service_orders) ? p.service_orders[0] : p.service_orders)?.order_number
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const when = p.due_date ? (p.due_date < today ? `que venceu em ${dayLabel(p.due_date)}` : p.due_date === today ? 'que vence hoje' : `que vence em ${dayLabel(p.due_date)}`) : 'em aberto'
    const ref = [os || null, p.notes].filter(Boolean).join(' · ')
    return sendEventMessage(db, companyId, 'cobranca', {
        phone: customer?.phone,
        customerId: p.customer_id ?? null,
        ref: opts.manual ? `${p.id}:${Date.now()}` : p.id,
        manual: opts.manual,
        userId: opts.userId,
        automations: opts.automations,
        storeName: opts.storeName,
        vars: {
            nome: (customer?.name ?? '').split(' ')[0],
            valor: brl(Number(p.amount) || 0),
            quando: when,
            vencimento: p.due_date ? dayLabel(p.due_date) : '',
            referencia: ref ? ` (${ref})` : '',
        },
    })
}
