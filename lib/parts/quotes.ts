import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { brl, cleanSearch } from '@/lib/alice/tools/helpers'
import { appUrl } from '@/lib/alice/config'
import { DEFAULT_TIMEZONE, dateStringInZone, timeInZone } from '@/lib/tasks/dates'

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

/** Horas até lembrar a loja de um orçamento que ainda não virou OS — serviço rápido, então o lembrete é rápido também. */
const REMINDER_HOURS = 2

/** Tarefa (com lembrete) avisando que o orçamento ainda não virou OS. Cancelada quando o orçamento é vinculado a uma OS. */
async function scheduleFollowUp(db: SupabaseClient, companyId: string, quoteId: string, deviceModel: string, service: string, link: string) {
    const remindAt = new Date(Date.now() + REMINDER_HOURS * 3_600_000)
    const { data: task, error } = await db.from('tasks').insert({
        company_id: companyId,
        title: `Orçamento em aberto: ${service} · ${deviceModel}`,
        notes: `Ainda não virou OS. Vale mandar um lembrete pro cliente.\n\n${link}`,
        priority: 2,
        do_date: dateStringInZone(DEFAULT_TIMEZONE, remindAt),
        do_time: timeInZone(DEFAULT_TIMEZONE, remindAt),
        source_key: `quote:${quoteId}`,
        source_href: '/pecas?tab=orcamentos',
    }).select('id').single()
    if (error || !task) { console.error('[part_quotes] follow-up task failed:', error); return }
    await db.from('task_reminders').insert({ company_id: companyId, task_id: task.id, remind_at: remindAt.toISOString() })
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
    const { data, error } = await db.from('part_quotes').insert({
        company_id: companyId,
        token,
        device_model: input.deviceModel,
        service: input.service,
        options: sortQuoteOptions(input.options),
        customer_name: input.customerName ?? null,
        customer_phone: input.customerPhone ?? null,
        valid_until: validUntil,
    }).select('id').single()
    if (error || !data) { console.error('[part_quotes] create failed:', error); return null }
    await scheduleFollowUp(db, companyId, data.id, input.deviceModel, input.service, `${appUrl()}/orcamento/${token}`)
    return token
}

/** Vincula o orçamento à OS que ele virou, e cancela o lembrete de orçamento parado. */
export async function markQuoteConverted(db: SupabaseClient, companyId: string, quoteId: string, serviceOrderId: string) {
    await db.from('part_quotes').update({ service_order_id: serviceOrderId }).eq('id', quoteId).eq('company_id', companyId)
    await db.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('company_id', companyId).eq('source_key', `quote:${quoteId}`)
}

/** Apaga o orçamento e cancela o lembrete pendente dele, se ainda não disparou. */
export async function deletePartQuote(db: SupabaseClient, companyId: string, quoteId: string) {
    await db.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('company_id', companyId).eq('source_key', `quote:${quoteId}`).eq('status', 'open')
    const { error } = await db.from('part_quotes').delete().eq('id', quoteId).eq('company_id', companyId)
    return !error
}

/** Texto pra cutucar o cliente sobre um orçamento parado — conversa de gente, não aviso de sistema. */
export function buildFollowUpMessage(deviceModel: string, service: string, link: string) {
    return `Oi, tudo bem? Vi aqui que você chegou a pedir um orçamento pra ${service.toLowerCase()} do seu ${deviceModel}. Ainda tá precisando? Consigo encaixar rapidinho aqui na loja, é só me falar 🙂\n\n${link}`
}

export interface QuoteRow { id: string; device_model: string; service: string; options: PartQuoteOption[]; valid_until: string; created_at: string; service_order_id: string | null }

/** Total, convertidos em OS, em aberto e vencidos sem confirmar. */
export function computeQuoteStats(rows: QuoteRow[]) {
    const now = Date.now()
    let converted = 0, open = 0, expired = 0
    for (const r of rows) {
        if (r.service_order_id) converted++
        else if (new Date(r.valid_until).getTime() < now) expired++
        else open++
    }
    const total = rows.length
    return { total, converted, open, expired, rate: total > 0 ? converted / total : null }
}

/** Texto pronto pra mandar no WhatsApp: as opções cotadas (com a diferença entre elas) + o link do orçamento. */
export function buildQuoteMessage(deviceModel: string, service: string, options: PartQuoteOption[], link: string) {
    const linhas = options.map(o => {
        const info = o.tipo ? TIER_INFO[o.tipo] : null
        return `• ${o.tipo ?? service}${info ? ` (${info.short})` : ''}: ${brl(o.valor)}`
    }).join('\n')
    return `Orçamento pra ${service} no ${deviceModel}:\n\n${linhas}\n\nValores a partir de, sujeitos à avaliação técnica na loja.\n\nDetalhes: ${link}`
}
