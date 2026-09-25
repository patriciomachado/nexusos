import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'
import { loadTeamSettings, monthRange } from '@/lib/team/server'

/**
 * Month performance per person: PDV sales they made, OS revenue as
 * technician, commission (sales % from Equipe + the technician's own rule)
 * and progress to their goal. ?month=YYYY-MM
 */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { db, companyId } = ctx
    const param = new URL(req.url).searchParams.get('month') ?? ''
    const month = /^\d{4}-\d{2}$/.test(param) ? param : new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
    const { from, to } = monthRange(month)

    const [{ data: users }, { data: techs }, { data: sales }, { data: osPays }, { team, revenueGoal }] = await Promise.all([
        db.from('users').select('id, full_name, role, is_active').eq('company_id', companyId),
        db.from('technicians').select('id, name, user_id, commission_type, commission_value').eq('company_id', companyId),
        db.from('sales').select('user_id, final_amount, status').eq('company_id', companyId).gte('created_at', from).lt('created_at', to).limit(20000),
        db.from('payments').select('amount, service_order_id').eq('company_id', companyId).eq('payment_status', 'completed').not('service_order_id', 'is', null).gte('payment_date', from).lt('payment_date', to).limit(20000),
        loadTeamSettings(db, companyId),
    ])

    const osIds = [...new Set((osPays ?? []).map(p => p.service_order_id as string))]
    const techOf = new Map<string, string | null>()
    for (let i = 0; i < osIds.length; i += 300) {
        const { data } = await db.from('service_orders').select('id, technician_id').in('id', osIds.slice(i, i + 300))
        for (const o of data ?? []) techOf.set(o.id, o.technician_id)
    }

    type Stat = { sales: number; salesCount: number; os: number; osCount: Set<string> }
    const byUser = new Map<string, Stat>()
    const stat = (id: string) => { let s = byUser.get(id); if (!s) { s = { sales: 0, salesCount: 0, os: 0, osCount: new Set() }; byUser.set(id, s) } return s }
    for (const s of sales ?? []) {
        if (!s.user_id || ['cancelled', 'cancelada'].includes(String(s.status))) continue
        const x = stat(s.user_id); x.sales += Number(s.final_amount) || 0; x.salesCount++
    }
    const techByUser = new Map((techs ?? []).filter(t => t.user_id).map(t => [t.user_id as string, t]))
    const userByTech = new Map((techs ?? []).filter(t => t.user_id).map(t => [t.id, t.user_id as string]))
    const techOnly = new Map<string, Stat>()
    for (const p of osPays ?? []) {
        const tech = techOf.get(p.service_order_id as string)
        if (!tech) continue
        const uid = userByTech.get(tech)
        const target = uid ? stat(uid) : (techOnly.get(tech) ?? (techOnly.set(tech, { sales: 0, salesCount: 0, os: 0, osCount: new Set() }), techOnly.get(tech)!))
        target.os += Number(p.amount) || 0
        target.osCount.add(p.service_order_id as string)
    }

    const commissionFor = (uid: string | null, techId: string | null, s: Stat) => {
        const m = uid ? team.members[uid] : undefined
        let c = (m?.sales_pct ?? 0) / 100 * s.sales
        const t = techId ? (techs ?? []).find(x => x.id === techId) : uid ? techByUser.get(uid) : undefined
        if (t && Number(t.commission_value)) c += t.commission_type === 'fixed' ? Number(t.commission_value) * s.osCount.size : Number(t.commission_value) / 100 * s.os
        return Math.round(c * 100) / 100
    }

    const people = (users ?? []).filter(u => u.is_active !== false).map(u => {
        const s = byUser.get(u.id) ?? { sales: 0, salesCount: 0, os: 0, osCount: new Set<string>() }
        const goal = team.members[u.id]?.goal ?? 0
        const total = s.sales + s.os
        return {
            id: u.id, name: u.full_name, role: u.role, kind: 'user' as const,
            sales: Math.round(s.sales * 100) / 100, sales_count: s.salesCount, os: Math.round(s.os * 100) / 100, os_count: s.osCount.size,
            total: Math.round(total * 100) / 100, goal, progress: goal ? total / goal : null,
            commission: commissionFor(u.id, null, s), sales_pct: team.members[u.id]?.sales_pct ?? 0,
            technician: techByUser.get(u.id) ? { commission_type: techByUser.get(u.id)!.commission_type, commission_value: Number(techByUser.get(u.id)!.commission_value) || 0 } : null,
        }
    })
    // Technicians without a login still earn commission.
    for (const [techId, s] of techOnly) {
        const t = (techs ?? []).find(x => x.id === techId)
        people.push({
            id: techId, name: t?.name ?? 'Técnico', role: 'technician', kind: 'user' as const,
            sales: 0, sales_count: 0, os: Math.round(s.os * 100) / 100, os_count: s.osCount.size, total: Math.round(s.os * 100) / 100,
            goal: 0, progress: null, commission: commissionFor(null, techId, s), sales_pct: 0,
            technician: t ? { commission_type: t.commission_type, commission_value: Number(t.commission_value) || 0 } : null,
        })
    }
    people.sort((a, b) => b.total - a.total)
    const storeTotal = people.reduce((s, p) => s + p.total, 0)
    return NextResponse.json({ month, people, store: { total: Math.round(storeTotal * 100) / 100, goal: revenueGoal } })
}
