import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const STATUS: Record<string, string> = { aberta: 'Aberta', agendada: 'Agendada', em_andamento: 'Em reparo', aguardando_pecas: 'Aguardando peça', concluida: 'Pronta', faturada: 'Entregue', cancelada: 'Cancelada' }

/**
 * Who did what: OS status changes, sales, register openings/closings and
 * manual cash movements, newest first. ?user=<id> filters one person.
 */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { db, companyId } = ctx
    const user = new URL(req.url).searchParams.get('user')
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString()

    const { data: users } = await db.from('users').select('id, full_name').eq('company_id', companyId)
    const name = new Map((users ?? []).map(u => [u.id, u.full_name as string]))
    const ids = (users ?? []).map(u => u.id)

    const osq = db.from('service_order_history').select('changed_by, changed_by_name, old_value, new_value, created_at, service_orders!inner(id, order_number, company_id)').eq('service_orders.company_id', companyId).eq('field_name', 'status').gte('created_at', since).order('created_at', { ascending: false }).limit(200)
    const saleq = db.from('sales').select('id, user_id, final_amount, status, created_at').eq('company_id', companyId).gte('created_at', since).order('created_at', { ascending: false }).limit(200)
    const regq = db.from('cash_registers').select('id, user_id, opened_at, closed_at, closed_by, status').eq('company_id', companyId).gte('opened_at', since).limit(200)
    const txq = db.from('cash_transactions').select('user_id, type, amount, source_type, justification, created_at').eq('company_id', companyId).in('source_type', ['manual_sangria', 'manual_suprimento', 'refund', 'bill']).gte('created_at', since).order('created_at', { ascending: false }).limit(200)
    const [os, sales, regs, txs] = await Promise.all([
        user ? osq.eq('changed_by', user) : osq,
        user ? saleq.eq('user_id', user) : saleq,
        regq,
        user ? txq.eq('user_id', user) : txq,
    ])

    type Ev = { at: string; who: string; text: string; href?: string; kind: string }
    const out: Ev[] = []
    for (const h of os.data ?? []) {
        const o = Array.isArray(h.service_orders) ? h.service_orders[0] : h.service_orders
        out.push({ at: h.created_at, who: (h.changed_by && name.get(h.changed_by)) || h.changed_by_name || '—', text: `OS ${o?.order_number}: ${STATUS[h.old_value] ?? h.old_value ?? '—'} → ${STATUS[h.new_value] ?? h.new_value}`, href: o ? `/service-orders/${o.id}` : undefined, kind: 'os' })
    }
    for (const s of sales.data ?? []) out.push({ at: s.created_at, who: name.get(s.user_id) ?? '—', text: `Venda #${String(s.id).slice(0, 4).toUpperCase()} de ${brl(Number(s.final_amount) || 0)}${s.status === 'cancelled' ? ' (devolvida)' : ''}`, href: `/pdv/recibo/${s.id}`, kind: 'sale' })
    for (const r of regs.data ?? []) {
        if (!user || r.user_id === user) out.push({ at: r.opened_at, who: name.get(r.user_id) ?? '—', text: 'Abriu o caixa', kind: 'cash' })
        if (r.closed_at && (!user || (r.closed_by ?? r.user_id) === user)) out.push({ at: r.closed_at, who: name.get(r.closed_by ?? r.user_id) ?? '—', text: 'Fechou o caixa', href: `/cash-register/relatorio/${r.id}`, kind: 'cash' })
    }
    const TX: Record<string, string> = { manual_sangria: 'Sangria', manual_suprimento: 'Suprimento', refund: 'Devolução', bill: 'Pagou conta' }
    for (const t of txs.data ?? []) out.push({ at: t.created_at, who: name.get(t.user_id) ?? '—', text: `${TX[t.source_type as string] ?? 'Movimentação'} de ${brl(Number(t.amount) || 0)}${t.justification ? ` · ${t.justification}` : ''}`, kind: 'cash' })

    out.sort((a, b) => b.at.localeCompare(a.at))
    return NextResponse.json({ data: out.slice(0, 200), users: ids.map(id => ({ id, name: name.get(id) })) })
}
