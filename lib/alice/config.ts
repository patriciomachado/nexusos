import type { SupabaseClient } from '@supabase/supabase-js'

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
 * Model for both agents. Override with ALICE_MODEL in the environment; the
 * default is Anthropic's recommended general model.
 */
export function aliceModel() {
    return process.env.ALICE_MODEL?.trim() || 'claude-opus-5'
}

export function aliceConfigured() {
    return !!process.env.ANTHROPIC_API_KEY?.trim()
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
    monthly_limit: number
    updated_at?: string
}

export const DEFAULT_SETTINGS: Omit<AliceSettings, 'company_id'> = {
    enabled: true,
    staff_roles: ['manager', 'technician', 'attendant'],
    store_info: null,
    whatsapp_enabled: false,
    whatsapp_phone_number_id: null,
    whatsapp_access_token: null,
    whatsapp_display_phone: null,
    whatsapp_verified_name: null,
    monthly_limit: 3000,
}

export async function loadSettings(db: SupabaseClient, companyId: string): Promise<AliceSettings> {
    const { data } = await db.from('alice_settings').select('*').eq('company_id', companyId).maybeSingle()
    return { ...DEFAULT_SETTINGS, ...(data ?? {}), company_id: companyId }
}

/** Settings as the admin screen sees them: the WhatsApp token never leaves the server. */
export function publicSettings(s: AliceSettings) {
    const { whatsapp_access_token, ...rest } = s
    return { ...rest, whatsapp_token_set: !!whatsapp_access_token }
}

export function isAdminRole(role: string) {
    return ADMIN_ROLES.includes(role)
}

/** May this user talk to Alice inside the app? */
export function canUseAlice(role: string, settings: AliceSettings) {
    if (isAdminRole(role)) return true
    return settings.enabled && settings.staff_roles.includes(role)
}

/** Replies Alice gave this calendar month (both channels), for the cost cap. */
export async function monthlyUsage(db: SupabaseClient, companyId: string) {
    const start = new Date()
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    const { count } = await db
        .from('alice_messages')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'assistant')
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
