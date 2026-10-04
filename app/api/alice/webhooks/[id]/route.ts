import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, firstIssue, uuid, webhookSchema } from '@/lib/alice/suite/api'
import { safeWebhookUrl, WEBHOOK_EVENTS } from '@/lib/alice/suite/webhooks'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    const parsed = webhookSchema.partial().safeParse(await req.json().catch(() => null))
    if (!parsed.success || !uuid.safeParse(id).success) return bad(parsed.success ? 'Webhook inválido.' : firstIssue(parsed.error))
    const patch: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.url !== undefined) {
        const url = safeWebhookUrl(parsed.data.url)
        if (!url) return bad('Use o endereço público (https://…) do seu sistema. Endereços internos não são aceitos.')
        patch.url = url
    }
    if (parsed.data.events) {
        const valid: string[] = WEBHOOK_EVENTS.map(e => e.value)
        patch.events = parsed.data.events.filter(e => valid.includes(e))
        if (!(patch.events as string[]).length) return bad('Escolha pelo menos um evento.')
    }
    const { data } = await ctx.db.from('alice_webhooks').update(patch).eq('id', id).eq('company_id', ctx.companyId).select('id, name, url, events, enabled, created_at').maybeSingle()
    if (!data) return bad('Webhook não encontrado.', 404)
    return NextResponse.json({ webhook: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('Webhook inválido.')
    await ctx.db.from('alice_webhooks').delete().eq('id', id).eq('company_id', ctx.companyId)
    return NextResponse.json({ ok: true })
}
