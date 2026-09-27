import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export interface PartQuoteOption { tipo: string | null; valor: number }

function genToken() {
    return randomBytes(9).toString('base64url')
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
