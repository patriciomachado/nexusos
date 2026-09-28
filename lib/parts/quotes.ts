import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { brl, cleanSearch } from '@/lib/alice/tools/helpers'

export interface PartQuoteOption { tipo: string | null; valor: number }

export const TIER_LABELS: Record<string, string> = { original: 'Genuína', premium: 'Premium', standard: 'Standard', paralela: 'Paralela', recondicionada: 'Recondicionada' }

/** O que diferencia cada linha de peça — usado na mensagem (resumo) e na página do orçamento (lista completa). */
export const TIER_INFO: Record<string, { short: string; bullets: string[] }> = {
    Genuína: {
        short: 'original, construção superior, até 1 ano de garantia',
        bullets: ['Matéria-prima de alta qualidade', 'Construção com aro diferenciado', 'Display o mais próximo possível do original', 'Componentes inclusos', 'Até 1 ano de garantia'],
    },
    Premium: {
        short: 'excelente custo-benefício, construção premium',
        bullets: ['Matéria-prima de qualidade', 'Construção com aro diferenciado', 'Boa resposta de toque, sem travamentos', 'Cores e brilho próximos do original', 'Boa durabilidade no dia a dia'],
    },
    Standard: {
        short: 'entrada, ótimo custo-benefício, com toque um pouco abaixo do original',
        bullets: [
            'Preço acessível',
            'Sensibilidade de toque um pouco menor',
            'Em aparelhos com tela LED: consome mais energia e a imagem fica com qualidade abaixo do original',
            'Qualidade superior ao padrão Original China',
            'Garantia diferenciada',
        ],
    },
}

// Sempre a mais cara primeiro: Genuína, depois Premium, depois Standard.
const TIER_ORDER = ['Genuína', 'Premium', 'Standard']

/** Ordena as opções do orçamento: Genuína → Premium → Standard, e por preço (maior primeiro) dentro do resto. */
export function sortQuoteOptions(options: PartQuoteOption[]): PartQuoteOption[] {
    const rank = (o: PartQuoteOption) => { const i = o.tipo ? TIER_ORDER.indexOf(o.tipo) : -1; return i === -1 ? TIER_ORDER.length : i }
    return [...options].sort((a, b) => rank(a) - rank(b) || b.valor - a.valor)
}

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
        options: sortQuoteOptions(input.options),
        customer_name: input.customerName ?? null,
        customer_phone: input.customerPhone ?? null,
        valid_until: validUntil,
    })
    if (error) { console.error('[part_quotes] create failed:', error); return null }
    return token
}

/** Texto pronto pra mandar no WhatsApp: as opções cotadas (com a diferença entre elas) + o link do orçamento. */
export function buildQuoteMessage(deviceModel: string, service: string, options: PartQuoteOption[], link: string) {
    const linhas = options.map(o => {
        const info = o.tipo ? TIER_INFO[o.tipo] : null
        return `• ${o.tipo ?? service}${info ? ` (${info.short})` : ''}: ${brl(o.valor)}`
    }).join('\n')
    return `Orçamento pra ${service} no ${deviceModel}:\n\n${linhas}\n\nValores a partir de, sujeitos à avaliação técnica na loja.\n\nDetalhes: ${link}`
}
