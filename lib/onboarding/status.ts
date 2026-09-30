import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

type Company = { id: string; phone?: string | null; address?: string | null; logo_url?: string | null; settings?: Record<string, unknown> | null }

/**
 * Should this company see the setup assistant? Only if it was never finished
 * or skipped AND the store still looks unconfigured. Stores set up before the
 * flag existed get it recorded here, so they never see it again.
 */
export async function needsOnboarding(db: SupabaseClient, company: Company) {
    const settings = company.settings ?? {}
    if (settings.onboarding_completed_at) return false

    const hasProfile = !!company.phone && !!(company.address || company.logo_url)
    let hasOrders = false
    if (!hasProfile) {
        const { count } = await db.from('service_orders').select('id', { count: 'exact', head: true }).eq('company_id', company.id)
        hasOrders = (count ?? 0) > 0
    }
    if (hasProfile || hasOrders) {
        await db.from('companies').update({ settings: { ...settings, onboarding_completed_at: new Date().toISOString() } }).eq('id', company.id)
        return false
    }
    return true
}
