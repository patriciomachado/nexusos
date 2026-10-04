import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, uuid } from '@/lib/alice/suite/api'
import { safeWebhookUrl, sendTest } from '@/lib/alice/suite/webhooks'

export const maxDuration = 30

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('Webhook inválido.')
    const { data: hook } = await ctx.db.from('alice_webhooks').select('id, company_id, url, secret').eq('id', id).eq('company_id', ctx.companyId).maybeSingle()
    if (!hook) return bad('Webhook não encontrado.', 404)
    if (!safeWebhookUrl(hook.url)) return bad('Endereço não permitido.')
    return NextResponse.json(await sendTest(ctx.db, hook))
}
