import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, firstIssue, webhookSchema } from '@/lib/alice/suite/api'
import { safeWebhookUrl, WEBHOOK_EVENTS } from '@/lib/alice/suite/webhooks'

const EVENT_VALUES: string[] = WEBHOOK_EVENTS.map(e => e.value)

/** The signing secret is shown once, when the webhook is created; afterwards only "has secret". */
function publicHook(h: Record<string, unknown>) {
    const { secret, ...rest } = h
    return { ...rest, has_secret: !!secret }
}

export async function GET() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { data, error } = await ctx.db.from('alice_webhooks').select('*').eq('company_id', ctx.companyId).order('created_at', { ascending: false })
    if (error) return bad('Não foi possível carregar. Rodou a migration 20261010_alice_whatsapp_suite.sql?', 500)
    return NextResponse.json({ webhooks: (data ?? []).map(publicHook), events: WEBHOOK_EVENTS })
}

export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const parsed = webhookSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const url = safeWebhookUrl(parsed.data.url)
    if (!url) return bad('Use o endereço público (https://…) do seu sistema. Endereços internos não são aceitos.')
    const events = parsed.data.events.filter(e => EVENT_VALUES.includes(e))
    if (!events.length) return bad('Escolha pelo menos um evento.')
    const secret = crypto.randomBytes(24).toString('hex')
    const { data, error } = await ctx.db.from('alice_webhooks').insert({ company_id: ctx.companyId, name: parsed.data.name, url, events, secret, enabled: parsed.data.enabled ?? true }).select('*').single()
    if (error) return bad('Não foi possível salvar.', 500)
    return NextResponse.json({ webhook: publicHook(data), secret })
}
