import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { isManager } from '@/lib/cash/server'
import FunilClient, { type FunnelEntry } from './FunilClient'

export default async function FunilPage() {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id, role').eq('clerk_id', userId).single()
    if (!user || !isManager(user.role)) redirect('/dashboard')
    const companyId = user.company_id

    const [{ data: rows }, { data: customers }] = await Promise.all([
        db.from('funnel_entries')
            .select('id, title, stage, value_estimate, source, notes, lost_reason, quote_id, service_order_id, sale_id, stage_changed_at, created_at, customer_id, lead_name, lead_phone, assigned_to, customers(name, phone), users:assigned_to(full_name)')
            .eq('company_id', companyId)
            .order('stage_changed_at', { ascending: false })
            .limit(500),
        db.from('customers').select('id, name, phone').eq('company_id', companyId).eq('is_active', true).order('name').limit(500),
    ])

    const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? (v[0] ?? null) : v)
    type Cust = { name: string; phone: string | null }
    type Assignee = { full_name: string | null }
    const entries: FunnelEntry[] = (rows ?? []).map(r => ({
        id: r.id,
        title: r.title,
        stage: r.stage,
        value_estimate: Number(r.value_estimate) || 0,
        source: r.source,
        notes: r.notes,
        lost_reason: r.lost_reason,
        quote_id: r.quote_id,
        service_order_id: r.service_order_id,
        sale_id: r.sale_id,
        stage_changed_at: r.stage_changed_at,
        created_at: r.created_at,
        customer_id: r.customer_id,
        lead_name: r.lead_name,
        lead_phone: r.lead_phone,
        assigned_to: r.assigned_to,
        customer: one(r.customers as Cust | Cust[] | null),
        assignee_name: one(r.users as Assignee | Assignee[] | null)?.full_name ?? null,
    }))

    return <FunilClient entries={entries} customers={customers ?? []} />
}
