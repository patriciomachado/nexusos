import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'
import { createFunnelEntry } from '@/lib/funnel/entries'
import { FUNNEL_SOURCES, isFunnelStage } from '@/lib/funnel/stages'

/** Funil de vendas: cartões abertos (não fechados nem perdidos ficam 90 dias visíveis por padrão). */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()

    const { data, error } = await ctx.db
        .from('funnel_entries')
        .select('id, title, stage, value_estimate, source, notes, lost_reason, quote_id, service_order_id, sale_id, stage_changed_at, created_at, customer_id, lead_name, lead_phone, assigned_to, customers(name, phone), users:assigned_to(full_name)')
        .eq('company_id', ctx.companyId)
        .order('stage_changed_at', { ascending: false })
        .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const title = String(body.title ?? '').trim().slice(0, 200)
    if (!title) return NextResponse.json({ error: 'Dê um título para o card.' }, { status: 400 })

    const customerId = typeof body.customer_id === 'string' && body.customer_id ? body.customer_id : null
    const leadName = typeof body.lead_name === 'string' ? body.lead_name.trim().slice(0, 120) || null : null
    const leadPhone = typeof body.lead_phone === 'string' ? body.lead_phone.trim().slice(0, 30) || null : null
    if (!customerId && !leadName) return NextResponse.json({ error: 'Escolha um cliente ou informe o nome do lead.' }, { status: 400 })

    const valueEstimate = Number(body.value_estimate)
    const stage = isFunnelStage(body.stage) ? body.stage : 'lead'

    try {
        const entry = await createFunnelEntry(ctx.db, {
            companyId: ctx.companyId,
            title,
            customerId,
            leadName,
            leadPhone,
            stage,
            valueEstimate: Number.isFinite(valueEstimate) && valueEstimate > 0 ? valueEstimate : 0,
            source: (FUNNEL_SOURCES as readonly string[]).includes(String(body.source)) ? (body.source as typeof FUNNEL_SOURCES[number]) : 'manual',
            notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) || null : null,
            createdBy: ctx.dbUser.id,
        })
        return NextResponse.json({ data: entry }, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
