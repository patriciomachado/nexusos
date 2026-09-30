import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { modelOptions } from '@/lib/alice/config'
import { getCompanyPlan } from '@/lib/plan-server'
import { PLANS } from '@/lib/plans'
import { eventById } from './events'
import { aiSubject, type Channel, type DeviceSource, type OsSource, type Source } from './sources'
import type { Brand } from './brand'

// ─── Sources from the database ───────────────────────────────────────────────

type Row = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const urls = (...lists: unknown[]) => lists.flat().filter((u): u is string => typeof u === 'string' && /^(https?:|data:image\/)/.test(u))

export const OS_SELECT = 'id, order_number, title, equipment_description, problem_description, solution_applied, photo_front_url, photo_back_url, status, updated_at, service_order_attachments(file_url, file_type, attachment_phase)'
export const DEVICE_SELECT = 'id, brand, model, storage, color, condition, battery_health, cash_price, installment_price, images, technical_passport, warranty_months, status, updated_at'

export function osSource(r: Row): OsSource {
    const photos = (Array.isArray(r.service_order_attachments) ? r.service_order_attachments as Row[] : []).filter(a => a.file_type === 'photo')
    const phase = (p: string) => photos.filter(a => a.attachment_phase === p).map(a => a.file_url)
    return {
        type: 'os',
        id: String(r.id),
        number: r.order_number != null ? String(r.order_number) : null,
        device: str(r.equipment_description) || str(r.title) || 'Aparelho',
        hasAfter: phase('after').length > 0,
        problem: str(r.problem_description).slice(0, 300),
        solution: str(r.solution_applied).slice(0, 300),
        // "Before" photos first and "after" photos last, so the before/after art picks them.
        photos: urls(phase('before'), r.photo_front_url, r.photo_back_url, phase('during'), phase('other'), photos.filter(a => !a.attachment_phase).map(a => a.file_url), phase('after')).slice(-8),
    }
}

export function deviceSource(r: Row): DeviceSource {
    const passport = (r.technical_passport ?? {}) as Row
    const warranty = Number(r.warranty_months ?? passport.warranty_months) || 0
    return {
        type: 'device',
        id: String(r.id),
        name: [str(r.brand), str(r.model), str(r.storage)].filter(Boolean).join(' '),
        condition: str(r.condition),
        price: Number(r.cash_price) || 0,
        installment: Number(r.installment_price) || 0,
        battery: r.battery_health != null ? Number(r.battery_health) : null,
        warrantyMonths: warranty,
        photos: urls(Array.isArray(r.images) ? r.images : []).slice(0, 6),
    }
}

/** Rebuilds a source from the database, so the AI never works on data the browser made up. */
export async function loadSource(db: SupabaseClient, companyId: string, raw: unknown): Promise<Source | null> {
    const s = (raw ?? {}) as Row
    if (s.type === 'os' && typeof s.id === 'string') {
        const { data } = await db.from('service_orders').select(OS_SELECT).eq('id', s.id).eq('company_id', companyId).maybeSingle()
        return data ? osSource(data as Row) : null
    }
    if (s.type === 'device' && typeof s.id === 'string') {
        const { data } = await db.from('devices').select(DEVICE_SELECT).eq('id', s.id).eq('company_id', companyId).maybeSingle()
        return data ? deviceSource(data as Row) : null
    }
    if (s.type === 'seasonal' && typeof s.id === 'string') return eventById(s.id) ? { type: 'seasonal', id: s.id } : null
    if (s.type === 'manual') return { type: 'manual', topic: str(s.topic).slice(0, 200) }
    return null
}

// ─── AI, with a monthly cap ──────────────────────────────────────────────────

/**
 * Cheap by default: Haiku writes short marketing texts well. Override with
 * STUDIO_MODEL (a current model runs with low effort).
 */
export function studioModel() {
    return process.env.STUDIO_MODEL?.trim() || 'claude-haiku-4-5'
}

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY?.trim()

export async function studioLimit(db: SupabaseClient, companyId: string) {
    return PLANS[await getCompanyPlan(db, companyId)].studioAiTexts
}

/** AI texts written this calendar month (UTC), for the cap. */
export async function studioUsage(db: SupabaseClient, companyId: string) {
    const start = new Date()
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    const { count } = await db.from('ai_usage').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId).eq('feature', 'studio').gte('created_at', start.toISOString())
    return count ?? 0
}

let client: Anthropic | null = null
const anthropic = () => (client ??= new Anthropic())

// Same text for every request: short on purpose, the answer is what costs.
const SYSTEM = `Você escreve conteúdo de marketing para assistências técnicas de celular e informática no Brasil.
Escreva em português do Brasil, tom próximo e direto, sem exageros nem promessas que a loja não pode cumprir (não invente preços, prazos ou descontos que não foram informados).
Responda só com o texto pedido, pronto para colar, sem títulos, aspas ou comentários.`

const ASK: Record<Channel, string> = {
    instagram: 'Legenda de Instagram: gancho na primeira linha, 3 a 6 linhas curtas, emojis com moderação, chamada para o WhatsApp e 3 a 5 hashtags no fim (uma com a cidade). Máximo 900 caracteres.',
    whatsapp: 'Mensagem de WhatsApp para clientes da loja: começa com "Oi!", 2 a 4 frases, amigável, termina convidando a responder. Máximo 400 caracteres.',
    google: 'Publicação para o Perfil da Empresa no Google: 2 a 3 frases, cita a cidade e o serviço, termina com o WhatsApp. Sem hashtags e sem emojis. Máximo 600 caracteres.',
    roteiro: 'Roteiro de vídeo curto (Reels/TikTok, até 30 s) no formato:\nGANCHO (3 s)\n<frase>\n\nCENA 1\n<o que mostrar e falar>\n\nCENA 2\n...\n\nCHAMADA\n<frase final com o WhatsApp>\nNo máximo 3 cenas.',
}

export async function writeWithAi(opts: {
    db: SupabaseClient
    companyId: string
    userId: string | null
    channel: Channel
    source: Source
    brand: Brand
    note?: string
}) {
    const { db, companyId, userId, channel, source, brand, note } = opts
    const model = studioModel()
    const store = [
        `Loja: ${brand.name}`,
        brand.city && `Cidade: ${brand.city}`,
        brand.whatsapp && `WhatsApp: ${brand.whatsapp}`,
        brand.instagram && `Instagram: @${brand.instagram}`,
        brand.tagline && `Slogan: ${brand.tagline}`,
    ].filter(Boolean).join('\n')

    const res = await anthropic().messages.create({
        model,
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: 'user', content: `${store}\n\n${aiSubject(source)}${note ? `\nPedido da loja: ${note.slice(0, 200)}` : ''}\n\n${ASK[channel]}` }],
        ...modelOptions(model, 'low'),
    })

    const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim()

    await db.from('ai_usage').insert({
        company_id: companyId,
        user_id: userId,
        feature: 'studio',
        kind: channel,
        model,
        input_tokens: res.usage.input_tokens,
        output_tokens: res.usage.output_tokens,
    })

    return text
}
