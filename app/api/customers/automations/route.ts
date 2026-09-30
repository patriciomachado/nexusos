import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'
import { normalizeAutomations, readyChannel } from '@/lib/customers/messages'

async function load(ctx: NonNullable<Awaited<ReturnType<typeof getContext>>>) {
    const { data } = await ctx.db.from('companies').select('settings, google_review_url').eq('id', ctx.companyId).single()
    const settings = (data?.settings ?? {}) as Record<string, unknown>
    return { settings, automations: normalizeAutomations(settings.automations), google: data?.google_review_url ?? null }
}

export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { automations, google } = await load(ctx)
    const alice = await readyChannel(ctx.db, ctx.companyId)
    return NextResponse.json({ ...automations, google_review_url: google, whatsapp_ready: !!alice, can_edit: isOwner(ctx.role) })
}

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({}))
    const { settings, automations } = await load(ctx)
    const next = normalizeAutomations({ ...automations, ...body })
    const { error } = await ctx.db.from('companies').update({ settings: { ...settings, automations: next } }).eq('id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(next)
}
