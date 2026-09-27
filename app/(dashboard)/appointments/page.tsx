import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import MesaClient, { type BoardOS } from './MesaClient'

const ACTIVE = ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas', 'concluida']
const daysAgoIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

export default async function MesaPage() {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId!).single()
    if (!user?.company_id) return null
    const companyId = user.company_id

    // Board: everything in progress plus what was delivered in the last 7 days.
    const weekAgo = daysAgoIso(7)
    const [{ data: active }, { data: delivered }, { data: technicians }] = await Promise.all([
        db.from('service_orders')
            .select('id, order_number, title, equipment_description, status, priority, created_at, updated_at, final_cost, estimated_cost, technician_id, customers(name, phone), technicians(name)')
            .eq('company_id', companyId).in('status', ACTIVE).order('created_at', { ascending: false }).limit(500),
        db.from('service_orders')
            .select('id, order_number, title, equipment_description, status, priority, created_at, updated_at, final_cost, estimated_cost, technician_id, customers(name, phone), technicians(name)')
            .eq('company_id', companyId).eq('status', 'faturada').gte('updated_at', weekAgo).order('updated_at', { ascending: false }).limit(60),
        db.from('technicians').select('id, name, user_id').eq('company_id', companyId).eq('is_active', true).order('name'),
    ])

    const orders = [...(active ?? []), ...(delivered ?? [])]

    // When each order entered its current stage (last status change).
    const since = new Map<string, string>()
    const ids = orders.map(o => o.id)
    for (let i = 0; i < ids.length; i += 300) {
        const { data } = await db.from('service_order_history')
            .select('service_order_id, created_at')
            .in('service_order_id', ids.slice(i, i + 300))
            .eq('field_name', 'status')
            .order('created_at', { ascending: false })
        for (const h of data ?? []) if (!since.has(h.service_order_id)) since.set(h.service_order_id, h.created_at)
    }

    const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] ?? null : v)
    const board: BoardOS[] = orders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        title: o.title,
        equipment: o.equipment_description,
        status: o.status,
        priority: o.priority,
        total: Number(o.final_cost || o.estimated_cost || 0),
        technician_id: o.technician_id,
        technician: one(o.technicians as { name: string } | { name: string }[] | null)?.name ?? null,
        customer: one(o.customers as { name: string; phone: string | null } | { name: string; phone: string | null }[] | null),
        stage_since: since.get(o.id) ?? o.created_at,
        created_at: o.created_at,
    }))

    const myTech = (technicians ?? []).find(t => t.user_id === user.id)?.id ?? null

    return (
        <MesaClient
            orders={board}
            technicians={(technicians ?? []).map(t => ({ id: t.id, name: t.name }))}
            myTechnicianId={myTech}
        />
    )
}
