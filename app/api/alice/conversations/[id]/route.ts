import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getContext, unauthorizedResponse, forbiddenResponse } from '@/lib/security'
import { canUseAlice, effectiveStatus, isAdminRole, loadSettings } from '@/lib/alice/config'
import { formatWhatsApp } from '@/lib/alice/phone'

type Params = { params: Promise<{ id: string }> }

/** App chats belong to their user; WhatsApp chats are visible to admins. */
async function load(id: string) {
    const ctx = await getContext()
    if (!ctx) return { response: unauthorizedResponse() }
    if (!z.string().uuid().safeParse(id).success) return { response: NextResponse.json({ error: 'Conversa inválida.' }, { status: 400 }) }
    const { data: conv } = await ctx.db
        .from('alice_conversations')
        .select('*')
        .eq('id', id)
        .eq('company_id', ctx.companyId)
        .maybeSingle()
    if (!conv) return { response: NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 }) }
    if (conv.channel === 'app') {
        const settings = await loadSettings(ctx.db, ctx.companyId)
        if (conv.user_id !== ctx.dbUser.id || !canUseAlice(ctx.role, settings)) return { response: NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 }) }
    } else if (!isAdminRole(ctx.role)) {
        return { response: forbiddenResponse() }
    }
    return { ctx, conv }
}

/** Timeline: messages people see plus the action cards, in order. */
export async function GET(_req: NextRequest, { params }: Params) {
    const { id } = await params
    const r = await load(id)
    if (r.response) return r.response
    const { ctx, conv } = r

    const [msgs, actions] = await Promise.all([
        ctx.db.from('alice_messages').select('id, role, text, created_at, author_user_id').eq('conversation_id', id).in('role', ['user', 'assistant', 'staff', 'event']).not('text', 'is', null).order('created_at', { ascending: false }).limit(200),
        ctx.db.from('alice_actions').select('id, tool, summary, status, result, error, created_at').eq('conversation_id', id).eq('kind', 'write').not('summary', 'is', null).order('created_at', { ascending: false }).limit(100),
    ])

    const items = [
        ...(msgs.data ?? []).map(m => ({ kind: 'message' as const, id: m.id, role: m.role, text: m.text, at: m.created_at })),
        ...(actions.data ?? []).map(a => {
            const [title, ...lines] = String(a.summary).split('\n')
            const result = a.result as { message?: string; href?: string } | null
            return { kind: 'action' as const, id: a.id, tool: a.tool, title, lines, status: effectiveStatus(a.status, a.created_at), message: result?.message ?? a.error ?? undefined, href: result?.href, at: a.created_at }
        }),
    ].sort((a, b) => a.at.localeCompare(b.at))

    if (conv.channel === 'whatsapp' && conv.unread_count) {
        await ctx.db.from('alice_conversations').update({ unread_count: 0 }).eq('id', id)
    }

    return NextResponse.json({
        conversation: {
            id: conv.id, channel: conv.channel, title: conv.title, mode: conv.mode,
            customer_name: conv.customer_name, customer_id: conv.customer_id,
            phone_label: conv.customer_phone ? formatWhatsApp(conv.customer_phone) : null,
            window_open: conv.last_customer_message_at ? Date.now() - new Date(conv.last_customer_message_at).getTime() < 24 * 3600 * 1000 : false,
        },
        items,
    })
}

const patchSchema = z.object({ mode: z.enum(['alice', 'human']) })

/** WhatsApp: hand the chat to a person, or back to Alice. */
export async function PATCH(req: NextRequest, { params }: Params) {
    const { id } = await params
    const r = await load(id)
    if (r.response) return r.response
    const { ctx, conv } = r
    if (conv.channel !== 'whatsapp') return NextResponse.json({ error: 'Só conversas do WhatsApp.' }, { status: 400 })
    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
    await ctx.db.from('alice_conversations').update({ mode: parsed.data.mode }).eq('id', id)
    await ctx.db.from('alice_messages').insert({
        conversation_id: id, company_id: ctx.companyId, role: 'event', author_user_id: ctx.dbUser.id,
        text: parsed.data.mode === 'human' ? `${ctx.dbUser.full_name ?? 'Um atendente'} assumiu a conversa.` : 'A conversa voltou para a Alice.',
    })
    return NextResponse.json({ mode: parsed.data.mode })
}

/** App: delete one of my conversations with Alice. */
export async function DELETE(_req: NextRequest, { params }: Params) {
    const { id } = await params
    const r = await load(id)
    if (r.response) return r.response
    if (r.conv.channel !== 'app') return NextResponse.json({ error: 'Conversas do WhatsApp ficam guardadas.' }, { status: 400 })
    await r.ctx.db.from('alice_conversations').delete().eq('id', id).eq('company_id', r.ctx.companyId)
    return NextResponse.json({ ok: true })
}
