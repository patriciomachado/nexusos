import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { appUrl } from '@/lib/alice/config'
import { sendEventMessage, type EventSendResult } from '@/lib/messages/server'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Status de OS que têm mensagem pro cliente (Configurações → Mensagens automáticas). */
const STATUS_EVENTS: Record<string, string> = {
    agendada: 'os_agendada',
    em_andamento: 'os_em_andamento',
    aguardando_pecas: 'os_aguardando_pecas',
    concluida: 'os_concluida',
    faturada: 'os_faturada',
    cancelada: 'os_cancelada',
}

export function orderEventKey(status: string) {
    return STATUS_EVENTS[status] ?? null
}

/**
 * Mensagem de OS pro cliente (aberta, ou um status novo), pelo WhatsApp da
 * loja, com o texto e a escolha de envio automático que a loja configurou.
 * `manual`: alguém pediu pra avisar agora, manda mesmo com o automático
 * desligado (e, sem WhatsApp conectado, volta o link wa.me pra mandar na mão).
 */
export async function notifyOrderEvent(db: SupabaseClient, companyId: string, osId: string, key: string, opts: { manual?: boolean; userId?: string | null } = {}): Promise<EventSendResult> {
    const [{ data: os }, { data: company }] = await Promise.all([
        db.from('service_orders')
            .select('order_number, title, equipment_description, final_cost, estimated_cost, tracking_token, customer_id, customers(name, phone)')
            .eq('id', osId).eq('company_id', companyId).single(),
        db.from('companies').select('address, city').eq('id', companyId).single(),
    ])
    if (!os) return { sent: false, reason: 'not_found' }
    const customer = Array.isArray(os.customers) ? os.customers[0] : os.customers
    const value = Number(os.final_cost || os.estimated_cost || 0)
    return sendEventMessage(db, companyId, key, {
        phone: customer?.phone,
        customerId: os.customer_id,
        // Uma vez por OS e evento por minuto: um clique duplo não manda duas vezes, mas voltar pro mesmo status depois manda de novo.
        ref: `${osId}:${Math.floor(Date.now() / 60_000)}`,
        manual: opts.manual,
        userId: opts.userId,
        vars: {
            nome: (customer?.name ?? '').split(' ')[0],
            os: os.order_number ?? '',
            aparelho: os.equipment_description || os.title || 'aparelho',
            valor: value > 0 ? brl(value) : '',
            link: os.tracking_token ? `${appUrl()}/tracking/${os.tracking_token}` : '',
            endereco: [company?.address, company?.city].filter(Boolean).join(', '),
        },
    })
}

/** Aviso de mudança de status (só pros status que têm mensagem). */
export async function notifyOrderStatus(db: SupabaseClient, companyId: string, osId: string, status: string, opts: { manual?: boolean; userId?: string | null } = {}) {
    const key = orderEventKey(status)
    return key ? notifyOrderEvent(db, companyId, osId, key, opts) : null
}
