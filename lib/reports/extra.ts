import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadCashSettings } from '@/lib/cash/server'
import type { Row } from './compute'

/**
 * Expenses that don't pass through a register but belong in the results:
 * bills paid from the bank and the card machine fees (estimated from the
 * rates in the cash settings). Returned shaped like cash exits.
 */
export async function extraExpenses(db: SupabaseClient, companyId: string, fromIso: string, toIso: string, payments: Row[]): Promise<Row[]> {
    const out: Row[] = []
    const [{ data: bills }, { cash }] = await Promise.all([
        db.from('bills').select('paid_amount, amount, paid_at, description')
            .eq('company_id', companyId).eq('status', 'paid').eq('paid_from', 'bank')
            .gte('paid_at', fromIso).lt('paid_at', toIso).limit(5000),
        loadCashSettings(db, companyId),
    ])
    for (const b of bills ?? []) {
        out.push({ type: 'exit', source_type: 'bill_bank', amount: Number(b.paid_amount ?? b.amount) || 0, created_at: b.paid_at, description: b.description })
    }
    const rate = (method: string) => {
        const m = method.toLowerCase()
        if (m.includes('debito') || m.includes('débito')) return cash.fees.debit.rate
        if (m.includes('credito') || m.includes('crédito')) return cash.fees.credit.rate
        if (m.includes('pix')) return cash.fees.pix.rate
        return 0
    }
    for (const p of payments) {
        const r = rate(String(p.payment_method ?? ''))
        if (!r) continue
        const fee = Math.round((Number(p.amount) || 0) * r) / 100
        if (fee > 0) out.push({ type: 'exit', source_type: 'card_fee', amount: fee, created_at: p.payment_date })
    }
    return out
}
