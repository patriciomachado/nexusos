import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { samePhone } from './phone'

export interface TrustedStaff { id: string; role: string; name: string | null }

/**
 * If `phone` belongs to a registered trusted number for this company, the
 * user it's linked to — Alice then treats the WhatsApp conversation as
 * staff, not a customer. Compared with samePhone (not a raw match) since
 * WhatsApp numbers can arrive with or without the mobile "9" prefix.
 */
export async function findTrustedStaff(db: SupabaseClient, companyId: string, phone: string): Promise<TrustedStaff | null> {
    const { data } = await db
        .from('alice_trusted_numbers')
        .select('phone, users(id, role, full_name, is_active)')
        .eq('company_id', companyId)
    type Row = { id: string; role: string; full_name: string | null; is_active: boolean }
    const match = (data ?? []).find(r => samePhone(r.phone, phone))
    if (!match) return null
    const u = (Array.isArray(match.users) ? match.users[0] : match.users) as Row | null
    if (!u || !u.is_active) return null
    return { id: u.id, role: u.role, name: u.full_name }
}

/**
 * Whether `phone` is (or ever was) a registered trusted number for this company — for keeping its
 * WhatsApp conversation admin-only. Unlike findTrustedStaff, this ignores the linked user's
 * is_active status: deactivating the account doesn't make that chat's financial/supplier history
 * safe to show the rest of the staff, so access control here never gets weaker than the data demands.
 */
export async function isTrustedNumber(db: SupabaseClient, companyId: string, phone: string | null | undefined): Promise<boolean> {
    if (!phone) return false
    const { data } = await db.from('alice_trusted_numbers').select('phone').eq('company_id', companyId)
    return (data ?? []).some(r => samePhone(r.phone, phone))
}
