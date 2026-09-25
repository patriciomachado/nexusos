import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadSettings } from '@/lib/alice/config'
import { channelReady, channelSend } from '@/lib/alice/channel'
import { brl, closingNumbers, loadCashSettings } from './server'

const TZ = 'America/Sao_Paulo'
const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })

/** Everything the closing report shows, for the app, the printable page and WhatsApp. */
export async function buildClosingReport(db: SupabaseClient, companyId: string, registerId: string) {
    const [{ data: reg }, { data: txs }, { data: company }, { cash }] = await Promise.all([
        db.from('cash_registers').select('*, opener:users!user_id(full_name), closer:users!closed_by(full_name)').eq('id', registerId).eq('company_id', companyId).single(),
        db.from('cash_transactions').select('type, amount, source_type, description, created_at, justification, payment_methods(name, code)').eq('cash_register_id', registerId).eq('company_id', companyId).order('created_at'),
        db.from('companies').select('name').eq('id', companyId).single(),
        loadCashSettings(db, companyId),
    ])
    if (!reg) return null
    const numbers = closingNumbers(Number(reg.opening_balance) || 0, txs ?? [], cash)
    const withdrawals = (txs ?? []).filter(t => t.source_type === 'manual_sangria')
    const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? null
    const opener = one(reg.opener as { full_name?: string } | null)?.full_name ?? null
    const closer = one(reg.closer as { full_name?: string } | null)?.full_name ?? null
    const counted = reg.counted_cash == null ? null : Number(reg.counted_cash)
    const diff = reg.cash_difference == null ? null : Number(reg.cash_difference)

    const lines = [
        `*Fechamento do caixa · ${company?.name ?? 'Loja'}*`,
        `${date(reg.opened_at)}, ${time(reg.opened_at)}–${reg.closed_at ? time(reg.closed_at) : 'aberto'}${opener ? ` · ${opener}` : ''}`,
        '',
        `Vendas e OS: ${numbers.sales} · ${brl(numbers.received)}`,
        numbers.byMethod.cash ? `• Dinheiro: ${brl(numbers.byMethod.cash)}` : null,
        numbers.byMethod.pix ? `• Pix: ${brl(numbers.byMethod.pix)}` : null,
        numbers.byMethod.debit ? `• Débito: ${brl(numbers.byMethod.debit)}` : null,
        numbers.byMethod.credit ? `• Crédito: ${brl(numbers.byMethod.credit)}` : null,
        numbers.byMethod.other ? `• Outros: ${brl(numbers.byMethod.other)}` : null,
        numbers.fees ? `Taxas da maquininha (estimadas): −${brl(numbers.fees)}` : null,
        numbers.expenses ? `Despesas pagas no caixa: ${brl(numbers.expenses)}` : null,
        numbers.withdrawals ? `Sangrias: ${brl(numbers.withdrawals)} (${withdrawals.length})` : null,
        numbers.refunds ? `Devoluções: ${brl(numbers.refunds)}` : null,
        numbers.supplies ? `Suprimentos: ${brl(numbers.supplies)}` : null,
        '',
        `Dinheiro esperado na gaveta: ${brl(numbers.expectedCash)}`,
        counted != null ? `Contado: ${brl(counted)}${diff != null && Math.abs(diff) >= 0.01 ? ` · ${diff > 0 ? 'sobrou' : 'faltou'} ${brl(Math.abs(diff))}` : ' · bateu ✓'}` : 'Dinheiro não foi contado.',
        reg.left_in_drawer != null ? `Ficou de troco: ${brl(Number(reg.left_in_drawer))}` : null,
        closer && closer !== opener ? `Fechado por ${closer}` : null,
    ].filter((l): l is string => l !== null)

    return { register: reg, opener, closer, numbers, transactions: txs ?? [], company: company?.name ?? 'Loja', text: lines.join('\n') }
}

/** Sends the closing report to the number set in the cash settings, through the store's WhatsApp (Alice). */
export async function sendClosingReport(db: SupabaseClient, companyId: string, registerId: string): Promise<{ sent: boolean; reason?: string }> {
    try {
        const { cash } = await loadCashSettings(db, companyId)
        if (!cash.report_phone) return { sent: false, reason: 'no_phone' }
        const alice = await loadSettings(db, companyId)
        if (alice.plan_blocked || !channelReady(alice)) return { sent: false, reason: 'no_whatsapp' }
        const report = await buildClosingReport(db, companyId, registerId)
        if (!report) return { sent: false, reason: 'not_found' }
        let to = cash.report_phone.replace(/\D/g, '')
        if (to.length <= 11) to = `55${to}`
        await channelSend(alice, to, report.text)
        return { sent: true }
    } catch (err) {
        console.error('[cash] closing report failed:', err)
        return { sent: false, reason: 'error' }
    }
}
