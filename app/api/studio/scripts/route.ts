import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { companyHasFeature, planRequiredResponse } from '@/lib/plan-server'

/** Saved Studio posts: texts per channel, art settings and status (ideia → pronto → publicado). */

const STATUSES = ['ideia', 'pronto', 'publicado']
const SOURCES = ['os', 'device', 'seasonal', 'manual']
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)

function fields(body: Record<string, unknown>) {
    const out: Record<string, unknown> = {}
    const t = text(body.title, 160); if (t !== undefined) out.title = t.trim() || 'Post'
    const ig = text(body.instagram, 3000); if (ig !== undefined) out.instagram_caption = ig
    const wa = text(body.whatsapp, 2000); if (wa !== undefined) out.whatsapp_text = wa
    const gg = text(body.google, 2000); if (gg !== undefined) out.google_post = gg
    const rt = text(body.roteiro, 4000); if (rt !== undefined) out.body_script = rt
    if (typeof body.status === 'string' && STATUSES.includes(body.status)) out.status = body.status
    if (body.scheduled_for === null || (typeof body.scheduled_for === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.scheduled_for))) out.scheduled_for = body.scheduled_for
    if (body.art && typeof body.art === 'object' && JSON.stringify(body.art).length < 4000) out.art = body.art
    return out
}

async function guard() {
    const ctx = await getContext()
    if (!ctx) return { error: unauthorizedResponse() }
    if (!await companyHasFeature(ctx.db, ctx.companyId, 'studio')) return { error: planRequiredResponse('studio') }
    return { ctx }
}

export async function GET() {
    const { ctx, error } = await guard()
    if (!ctx) return error
    const { data, error: dbError } = await ctx.db.from('studio_scripts').select('*')
        .eq('company_id', ctx.companyId).order('created_at', { ascending: false }).limit(200)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
    const { ctx, error } = await guard()
    if (!ctx) return error
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const sourceType = typeof body.source_type === 'string' && SOURCES.includes(body.source_type) ? body.source_type : 'manual'
    const patch = fields(body)
    const { data, error: dbError } = await ctx.db.from('studio_scripts').insert({
        title: 'Post',
        ...patch,
        // First time a post is saved already "publicado": mark today as a publish day for the streak.
        published_at: patch.status === 'publicado' ? new Date().toISOString() : null,
        company_id: ctx.companyId,
        user_id: ctx.dbUser.id,
        source_type: sourceType,
        source_id: text(body.source_id, 80) || null,
        category: sourceType,
    }).select().single()
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
    const { ctx, error } = await guard()
    if (!ctx) return error
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    const patch = fields(body)
    // Streak base: the day a post first becomes "publicado", not the (possibly later-edited) scheduled date.
    if (patch.status === 'publicado') {
        const { data: current } = await ctx.db.from('studio_scripts').select('published_at')
            .eq('id', body.id).eq('company_id', ctx.companyId).maybeSingle()
        if (current && !current.published_at) patch.published_at = new Date().toISOString()
    }
    const { data, error: dbError } = await ctx.db.from('studio_scripts')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', body.id).eq('company_id', ctx.companyId).select().maybeSingle()
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
    const { ctx, error } = await guard()
    if (!ctx) return error
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    const { error: dbError } = await ctx.db.from('studio_scripts').delete().eq('id', id).eq('company_id', ctx.companyId)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
