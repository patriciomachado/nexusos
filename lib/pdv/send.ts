import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadReceipt } from '@/lib/pdv/receipt'
import { sendEventMessage, type EventSendResult } from '@/lib/messages/server'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Recibo da venda pro WhatsApp do cliente, com o texto de "Recibo da venda"
 * (Configurações → Mensagens automáticas). `manual`: o botão da tela — manda
 * mesmo com o automático desligado e pode repetir; sem ele, sai uma vez por
 * venda e só com o automático ligado.
 */
export async function sendSaleReceipt(db: SupabaseClient, companyId: string, saleId: string, opts: { manual?: boolean; phone?: string | null; userId?: string | null } = {}): Promise<EventSendResult> {
    const r = await loadReceipt(db, companyId, saleId)
    if (!r) return { sent: false, reason: 'not_found' }
    return sendEventMessage(db, companyId, 'venda_recibo', {
        phone: opts.phone || r.customer?.phone,
        customerId: r.sale.customer_id ?? null,
        ref: opts.manual ? `${saleId}:${Date.now()}` : saleId,
        manual: opts.manual,
        userId: opts.userId,
        vars: {
            nome: (r.customer?.name ?? '').split(' ')[0],
            recibo: r.text,
            total: brl(Number(r.sale.final_amount ?? r.sale.total_amount) || 0),
        },
    })
}
