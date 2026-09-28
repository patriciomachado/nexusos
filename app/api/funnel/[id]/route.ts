import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'
import { moveFunnelEntry } from '@/lib/funnel/entries'
import { isFunnelStage } from '@/lib/funnel/stages'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { id } = await params
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    if (isFunnelStage(body.stage)) {
        try {
            await moveFunnelEntry(ctx.db, ctx.companyId, id, {
                stage: body.stage,
                lostReason: typeof body.lost_reason === 'string' ? body.lost_reason.trim().slice(0, 300) || null : null,
            })
        } catch (err) {
            return NextResponse.json({ error: (err as Error).message }, { status: 500 })
        }
    }

    const patch: Record<string, unknown> = {}
    if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 200)
    if (typeof body.notes === 'string') patch.notes = body.notes.trim().slice(0, 1000) || null
    if (body.value_estimate != null && Number.isFinite(Number(body.value_estimate))) patch.value_estimate = Math.max(0, Number(body.value_estimate))
    if (typeof body.assigned_to === 'string') patch.assigned_to = body.assigned_to || null

    if (Object.keys(patch).length) {
        patch.updated_at = new Date().toISOString()
        const { error } = await ctx.db.from('funnel_entries').update(patch).eq('id', id).eq('company_id', ctx.companyId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { id } = await params
    const { error } = await ctx.db.from('funnel_entries').delete().eq('id', id).eq('company_id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
