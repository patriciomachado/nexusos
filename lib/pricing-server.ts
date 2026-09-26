import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hourCost, normalizePricing, type PricingData, type PricingSettings, type ServiceRow } from '@/lib/pricing'
import { normalizeCashSettings } from '@/lib/cash/server'

const dayIso = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

/**
 * The store's monthly fixed costs from Contas: bills set to repeat every
 * month, one per description (the most recent amount).
 */
export async function monthlyBills(db: SupabaseClient, companyId: string) {
    const { data } = await db.from('bills')
        .select('description, amount, due_date')
        .eq('company_id', companyId).eq('repeat_monthly', true).neq('status', 'cancelled')
        .gte('due_date', dayIso(-62)).lte('due_date', dayIso(45))
        .order('due_date', { ascending: false })
        .limit(500)
    const seen = new Map<string, number>()
    for (const b of data ?? []) {
        const key = String(b.description ?? '').trim().toLowerCase()
        if (!seen.has(key)) seen.set(key, Number(b.amount) || 0)
    }
    return { total: Array.from(seen.values()).reduce((s, v) => s + v, 0), count: seen.size }
}

export async function loadPricing(db: SupabaseClient, companyId: string): Promise<PricingData> {
    const [{ data: company }, bills, { data: services }] = await Promise.all([
        db.from('companies').select('settings').eq('id', companyId).single(),
        monthlyBills(db, companyId),
        // '*': estimated_time_minutes only exists after the 20261003 migration.
        db.from('service_types').select('*').eq('company_id', companyId).order('name'),
    ])
    const all = (company?.settings ?? {}) as Record<string, unknown>
    const settings: PricingSettings = normalizePricing(all.pricing)
    const cash = normalizeCashSettings(all.cash)
    return {
        settings,
        bills,
        hourCost: hourCost(settings, bills.total),
        fees: { credit: cash.fees.credit.rate, installments: cash.fees.credit_installments.rate },
        services: ((services ?? []) as Record<string, unknown>[])
            .filter(s => s.is_active !== false)
            .map((s): ServiceRow => ({
                id: String(s.id),
                name: String(s.name ?? ''),
                description: (s.description as string | null) ?? null,
                minutes: s.estimated_time_minutes == null ? null : Number(s.estimated_time_minutes),
                price: Number(s.base_price) || 0,
            })),
    }
}

export async function savePricing(db: SupabaseClient, companyId: string, pricing: PricingSettings) {
    const { data } = await db.from('companies').select('settings').eq('id', companyId).single()
    const all = (data?.settings ?? {}) as Record<string, unknown>
    const { error } = await db.from('companies').update({ settings: { ...all, pricing } }).eq('id', companyId)
    if (error) throw error
}
