import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The company that pays: a branch (filial) uses its head office's
 * subscription. Falls back to the company itself when the column is missing.
 */
export async function billingCompanyId(db: SupabaseClient, companyId: string) {
    const { data, error } = await db.from('companies').select('parent_company_id').eq('id', companyId).maybeSingle()
    if (error || !data) return companyId
    return (data.parent_company_id as string | null) ?? companyId
}

export interface StoreRow { id: string; name: string; city: string | null; logo_url: string | null; parent_company_id: string | null; role: string; current: boolean }

/**
 * Stores this login can switch to: the one it is in now plus every store it
 * was given access to (created as a branch or added by the owner).
 */
export async function listStores(db: SupabaseClient, clerkId: string, currentCompanyId: string, currentRole: string): Promise<StoreRow[]> {
    const { data: access } = await db.from('store_access').select('company_id, role').eq('clerk_id', clerkId)
    const roles = new Map<string, string>((access ?? []).map(a => [a.company_id as string, a.role as string]))
    roles.set(currentCompanyId, currentRole)
    const { data: companies } = await db.from('companies').select('id, name, city, logo_url, parent_company_id').in('id', [...roles.keys()])
    return (companies ?? [])
        .map(c => ({ id: c.id, name: c.name, city: c.city, logo_url: c.logo_url, parent_company_id: c.parent_company_id ?? null, role: roles.get(c.id) ?? 'attendant', current: c.id === currentCompanyId }))
        // Head office first, then branches by name.
        .sort((a, b) => Number(!!a.parent_company_id) - Number(!!b.parent_company_id) || a.name.localeCompare(b.name, 'pt-BR'))
}
