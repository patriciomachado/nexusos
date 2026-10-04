import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { appUrl, loadSettings } from '@/lib/alice/config'
import { channelReady, channelSend } from '@/lib/alice/channel'
import { digitsOnly } from '@/lib/alice/phone'
import { fill, normalizeAutomations } from '@/lib/customers/templates'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * "Your device is ready" message to the customer, sent from the store's
 * WhatsApp (Alice's connection). Without WhatsApp connected, returns a
 * wa.me link with the same text so it can be sent by hand.
 */
export async function notifyReady(db: SupabaseClient, companyId: string, osId: string): Promise<{ sent: boolean; url?: string; reason?: string }> {
    const [{ data: os }, { data: company }] = await Promise.all([
        db.from('service_orders')
            .select('order_number, title, equipment_description, final_cost, estimated_cost, tracking_token, customers(name, phone)')
            .eq('id', osId).eq('company_id', companyId).single(),
        db.from('companies').select('name, address, city, settings').eq('id', companyId).single(),
    ])
    if (!os) return { sent: false, reason: 'not_found' }
    const auto = normalizeAutomations((company?.settings as Record<string, unknown> | null)?.automations)
    if (!auto.os_ready) return { sent: false, reason: 'disabled' }
    const customer = Array.isArray(os.customers) ? os.customers[0] : os.customers
    let phone = digitsOnly(customer?.phone)
    if (phone.length < 10) return { sent: false, reason: 'no_phone' }
    if (phone.length <= 11) phone = `55${phone}`

    const first = (customer?.name ?? '').split(' ')[0]
    const what = os.equipment_description || os.title || 'aparelho'
    const value = Number(os.final_cost || os.estimated_cost || 0)
    const where = [company?.address, company?.city].filter(Boolean).join(', ')
    const text = fill(auto.os_ready_text, {
        nome: first,
        aparelho: what,
        os: os.order_number,
        valor: value > 0 ? `Valor: ${brl(value)}.\n` : '',
        loja: company?.name ?? 'loja',
        endereco: where ? ` (${where})` : '',
        link: os.tracking_token ? `${appUrl()}/tracking/${os.tracking_token}` : '',
    }).replace(/\n?Detalhes: $/, '').trim()

    try {
        const alice = await loadSettings(db, companyId)
        if (!alice.plan_blocked && channelReady(alice)) {
            await channelSend(alice, phone, text)
            return { sent: true }
        }
    } catch (err) {
        console.error('[os] ready notice failed:', err)
    }
    return { sent: false, url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}` }
}
