import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { cleanSearch } from '@/lib/alice/tools/helpers'

export interface PartQuoteOption { tipo: string | null; valor: number }

export const TIER_LABELS: Record<string, string> = { original: 'Genuína', premium: 'Premium', standard: 'Standard', paralela: 'Paralela', recondicionada: 'Recondicionada' }

function genToken() {
    return randomBytes(9).toString('base64url')
}

/** Preços já cadastrados (tabela de Peças) pra um aparelho + serviço, com a qualidade de cada peça vinculada. */
export async function findQuoteOptions(db: SupabaseClient, companyId: string, deviceModel: string, service: string): Promise<{ deviceModel: string; options: PartQuoteOption[] } | null> {
    const { data: rows } = await db.from('repair_prices')
        .select('device_model, price, inventory_items(part_quality)')
        .eq('company_id', companyId)
        .ilike('device_model', `%${cleanSearch(deviceModel)}%`)
        .ilike('service', `%${cleanSearch(service)}%`)
        .limit(10)
    if (!rows?.length) return null
    const options = rows.map(r => {
        const part = (Array.isArray(r.inventory_items) ? r.inventory_items[0] : r.inventory_items) as { part_quality?: string | null } | null
        const quality = part?.part_quality ?? null
        return { tipo: quality ? (TIER_LABELS[quality] ?? quality) : null, valor: Number(r.price) || 0 }
    })
    return { deviceModel: rows[0].device_model, options }
}

/** Grava as opções cotadas pra um aparelho/serviço com um token público, pra virar um link de orçamento. */
export async function createPartQuote(db: SupabaseClient, companyId: string, input: {
    deviceModel: string
    service: string
    options: PartQuoteOption[]
    customerName?: string | null
    customerPhone?: string | null
    validDays?: number
}): Promise<string | null> {
    const token = genToken()
    const validUntil = new Date(Date.now() + (input.validDays ?? 7) * 86_400_000).toISOString()
    const { error } = await db.from('part_quotes').insert({
        company_id: companyId,
        token,
        device_model: input.deviceModel,
        service: input.service,
        options: input.options,
        customer_name: input.customerName ?? null,
        customer_phone: input.customerPhone ?? null,
        valid_until: validUntil,
    })
    if (error) { console.error('[part_quotes] create failed:', error); return null }
    return token
}
