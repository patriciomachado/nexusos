import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'
import { eventMessage, normalizeAutomations, readyChannel, type Automations } from '@/lib/customers/messages'
import { MAX_MESSAGE_LENGTH, MESSAGE_EVENTS, messageEvent } from '@/lib/messages/catalog'

async function load(ctx: NonNullable<Awaited<ReturnType<typeof getContext>>>) {
    const { data } = await ctx.db.from('companies').select('settings, google_review_url').eq('id', ctx.companyId).single()
    const settings = (data?.settings ?? {}) as Record<string, unknown>
    return { settings, automations: normalizeAutomations(settings.automations), google: data?.google_review_url ?? null }
}

function view(automations: Automations) {
    return {
        messages: MESSAGE_EVENTS.map(e => ({ key: e.key, ...eventMessage(automations, e.key) })),
        review_days: automations.review_days,
    }
}

/** Todas as mensagens automáticas da loja (texto + envio automático), de todos os módulos. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { automations, google } = await load(ctx)
    const alice = await readyChannel(ctx.db, ctx.companyId)
    return NextResponse.json({ ...view(automations), google_review_url: google, whatsapp_ready: !!alice, can_edit: isOwner(ctx.role) })
}

const schema = z.object({
    messages: z.record(z.string(), z.object({
        auto: z.boolean().optional(),
        text: z.string().max(MAX_MESSAGE_LENGTH, `A mensagem pode ter até ${MAX_MESSAGE_LENGTH} caracteres`).optional(),
    })).optional(),
    review_days: z.number().int().min(1).max(30).optional(),
})

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })

    const { settings, automations } = await load(ctx)
    const next: Automations = { ...automations, events: { ...automations.events } }
    for (const [key, patch] of Object.entries(parsed.data.messages ?? {})) {
        const e = messageEvent(key)
        if (!e) continue
        const current = eventMessage(automations, key)
        const auto = e.canAuto === false ? false : patch.auto ?? current.auto
        // Texto em branco volta pro padrão.
        const text = patch.text === undefined ? current.text : patch.text.trim() || e.defaultText
        if (e.legacy) {
            next[e.legacy.auto] = auto
            next[e.legacy.text] = text.slice(0, 600)
        } else {
            next.events[key] = { auto, text }
        }
    }
    if (parsed.data.review_days) next.review_days = parsed.data.review_days

    const normalized = normalizeAutomations(next)
    const { error } = await ctx.db.from('companies').update({ settings: { ...settings, automations: normalized } }).eq('id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(view(normalized))
}
