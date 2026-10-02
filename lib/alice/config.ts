import type { SupabaseClient } from '@supabase/supabase-js'
import { getCompanyPlan } from '@/lib/plan-server'
import { hasFeature, PLANS, type PlanId } from '@/lib/plans'
import { DEFAULT_BUSINESS_HOURS, normalizeBusinessHours, type BusinessHours } from './hours'

/** Full control: configure Alice and use every tool. */
export const ADMIN_ROLES = ['admin', 'owner']

/** Roles an admin can allow to use Alice inside the app (CRM tools only). */
export const STAFF_ROLES = ['manager', 'technician', 'attendant', 'cashier', 'talento'] as const

export const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    owner: 'Proprietário',
    manager: 'Gerente',
    technician: 'Técnico',
    attendant: 'Atendente',
    cashier: 'Caixa',
    talento: 'Talento',
}

/**
 * Model per channel, chosen for cost (see the pricing study):
 * - app (staff; creates OS, reads finances): Claude Sonnet 5
 * - WhatsApp (short customer answers, high volume): Claude Haiku 4.5
 * Override with ALICE_MODEL / ALICE_WHATSAPP_MODEL.
 */
export function aliceModel(channel: 'app' | 'whatsapp' = 'app') {
    if (channel === 'whatsapp') return process.env.ALICE_WHATSAPP_MODEL?.trim() || 'claude-haiku-4-5'
    return process.env.ALICE_MODEL?.trim() || 'claude-sonnet-5'
}

/**
 * Request options each model accepts. Adaptive thinking and `effort` exist on
 * the current generation (Sonnet 5, Opus 5, Fable…); Haiku 4.5 and older
 * reject them, so they run without extended thinking.
 */
export function modelOptions(model: string, effort: 'low' | 'medium' | 'high') {
    const legacy = /haiku-4|sonnet-4-5|opus-4-5|-3-|claude-3/.test(model)
    return legacy ? {} : { thinking: { type: 'adaptive' as const }, output_config: { effort } }
}

export function aliceConfigured() {
    return !!process.env.ANTHROPIC_API_KEY?.trim()
}

export type WhatsAppProvider = 'cloud' | 'evolution' | 'zapi'

export type AliceTone = 'professional' | 'friendly' | 'casual' | 'custom'
export type EmojiUsage = 'none' | 'moderate' | 'frequent'

export const TONE_LABELS: Record<AliceTone, string> = { professional: 'Profissional', friendly: 'Amigável', casual: 'Descontraída', custom: 'Personalizado' }
export const EMOJI_LABELS: Record<EmojiUsage, string> = { none: 'Nenhum', moderate: 'Moderado', frequent: 'À vontade' }

const TONE_TEXT: Record<Exclude<AliceTone, 'custom'>, string> = {
    professional: 'Tom profissional e direto, cordial mas sem intimidade.',
    friendly: 'Tom amigável e caloroso, como alguém da loja que já conhece o cliente.',
    casual: 'Tom descontraído e informal, como papo entre amigos — mas sempre respeitoso.',
}
const EMOJI_TEXT: Record<EmojiUsage, string> = {
    none: 'Não use emojis.',
    moderate: 'No máximo um emoji por mensagem, só quando fizer sentido.',
    frequent: 'Pode usar emojis com mais liberdade pra deixar a conversa leve.',
}

/** One line for the system prompt: tom de voz + uso de emoji, as the owner configured for this store. */
export function styleInstruction(settings: Pick<AliceSettings, 'tone' | 'tone_custom' | 'emoji_usage'>): string {
    const tone = settings.tone === 'custom' && settings.tone_custom?.trim() ? settings.tone_custom.trim() : TONE_TEXT[settings.tone === 'custom' ? 'professional' : settings.tone]
    return `Estilo definido pela loja: ${tone} ${EMOJI_TEXT[settings.emoji_usage]}`
}

export interface AliceSettings {
    company_id: string
    enabled: boolean
    staff_roles: string[]
    store_info: string | null
    whatsapp_enabled: boolean
    whatsapp_phone_number_id: string | null
    whatsapp_access_token: string | null
    whatsapp_display_phone: string | null
    whatsapp_verified_name: string | null
    /** cloud = Meta Cloud API; evolution / zapi = the store's own number connected by QR code. */
    whatsapp_provider: WhatsAppProvider
    whatsapp_gateway_url: string | null
    whatsapp_gateway_instance: string | null
    whatsapp_gateway_token: string | null
    whatsapp_gateway_client_token: string | null
    whatsapp_webhook_secret: string | null
    /** Instagram Direct (Instagram Messaging API) — same manual-credential pattern as WhatsApp Cloud API. */
    instagram_enabled: boolean
    instagram_account_id: string | null
    instagram_access_token: string | null
    instagram_username: string | null
    monthly_limit: number
    /** Cliente pergunta o preço de uma peça (ex.: troca de tela) e há valor cadastrado: manda direto, sem esperar confirmação da loja. */
    auto_quote_parts: boolean
    tone: AliceTone
    tone_custom: string | null
    emoji_usage: EmojiUsage
    /** Palavras que, se aparecerem na mensagem do cliente, chamam um atendente na hora (não depende do julgamento da IA). */
    escalation_keywords: string[]
    business_hours: BusinessHours
    updated_at?: string
    /** The company's plan does not include Alice (Essencial). */
    plan_blocked?: boolean
    /** Replies per month the plan allows; monthly_limit never goes above it. */
    plan_limit?: number
}

export const DEFAULT_SETTINGS: Omit<AliceSettings, 'company_id'> = {
    enabled: true,
    staff_roles: ['manager', 'technician', 'attendant'],
    store_info: null,
    whatsapp_enabled: false,
    whatsapp_phone_number_id: null,
    whatsapp_access_token: null,
    whatsapp_provider: 'cloud',
    whatsapp_gateway_url: null,
    whatsapp_gateway_instance: null,
    whatsapp_gateway_token: null,
    whatsapp_gateway_client_token: null,
    whatsapp_webhook_secret: null,
    whatsapp_display_phone: null,
    whatsapp_verified_name: null,
    instagram_enabled: false,
    instagram_account_id: null,
    instagram_access_token: null,
    instagram_username: null,
    monthly_limit: 1500,
    auto_quote_parts: false,
    tone: 'professional',
    tone_custom: null,
    emoji_usage: 'moderate',
    escalation_keywords: [],
    business_hours: DEFAULT_BUSINESS_HOURS,
}

export async function loadSettings(db: SupabaseClient, companyId: string): Promise<AliceSettings> {
    const [{ data }, plan] = await Promise.all([
        db.from('alice_settings').select('*').eq('company_id', companyId).maybeSingle(),
        getCompanyPlan(db, companyId),
    ])
    const merged = { ...DEFAULT_SETTINGS, ...(data ?? {}), company_id: companyId }
    merged.business_hours = normalizeBusinessHours(merged.business_hours)
    return withPlan(merged, plan)
}

/** Applies the plan on top of what the admin saved: off on Essencial, limit capped on Pro. */
export function withPlan(settings: AliceSettings, plan: PlanId): AliceSettings {
    const planLimit = PLANS[plan].aliceReplies
    if (!hasFeature(plan, 'alice')) {
        return { ...settings, enabled: false, whatsapp_enabled: false, instagram_enabled: false, monthly_limit: 0, plan_blocked: true, plan_limit: 0 }
    }
    return { ...settings, monthly_limit: Math.min(settings.monthly_limit, planLimit), plan_blocked: false, plan_limit: planLimit }
}

/** Settings as the admin screen sees them: tokens never leave the server. */
export function publicSettings(s: AliceSettings) {
    const { whatsapp_access_token, whatsapp_gateway_token, whatsapp_gateway_client_token, whatsapp_webhook_secret, instagram_access_token, ...rest } = s
    return {
        ...rest,
        whatsapp_token_set: !!whatsapp_access_token,
        whatsapp_gateway_token_set: !!whatsapp_gateway_token,
        whatsapp_gateway_client_token_set: !!whatsapp_gateway_client_token,
        whatsapp_webhook_ready: !!whatsapp_webhook_secret,
        instagram_token_set: !!instagram_access_token,
    }
}

export function isAdminRole(role: string) {
    return ADMIN_ROLES.includes(role)
}

/** May this user talk to Alice inside the app? */
export function canUseAlice(role: string, settings: AliceSettings) {
    if (settings.plan_blocked) return false
    if (isAdminRole(role)) return true
    return settings.enabled && settings.staff_roles.includes(role)
}

/** Answers Alice gave this calendar month (both channels, tool-only rounds not counted), for the cost cap. */
export async function monthlyUsage(db: SupabaseClient, companyId: string) {
    const start = new Date()
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    const { count } = await db
        .from('alice_messages')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'assistant')
        .not('text', 'is', null)
        .gte('created_at', start.toISOString())
    return count ?? 0
}

export function appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://nexusgestor.com').replace(/\/$/, '')
}

/** A prepared action may be confirmed for this long. */
export const CONFIRM_WINDOW_MS = 30 * 60 * 1000

/** Proposals nobody confirmed in time read as expired everywhere. */
export function effectiveStatus(status: string, createdAt: string) {
    return status === 'proposed' && Date.now() - new Date(createdAt).getTime() > CONFIRM_WINDOW_MS ? 'expired' : status
}
