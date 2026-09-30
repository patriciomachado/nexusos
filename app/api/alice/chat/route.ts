import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceUser, storeName } from '@/lib/alice/access'
import { aliceConfigured, monthlyUsage } from '@/lib/alice/config'
import { runAlice, saveMessage, describeFailure, type AgentEvent } from '@/lib/alice/agent'

export const maxDuration = 120

const bodySchema = z.object({
    conversationId: z.string().uuid().optional(),
    message: z.string().trim().min(1).max(4000),
    voice: z.boolean().optional(),
})

/**
 * Sends a message to Alice and streams her answer as newline-delimited JSON:
 * {t:'conversation',id} first, then text deltas, tool/action events, and {t:'done'}.
 */
export async function POST(req: NextRequest) {
    const access = await requireAliceUser()
    if (access.response) return access.response
    const { ctx, settings } = access

    if (!aliceConfigured()) {
        return NextResponse.json({ error: 'Falta configurar a chave da IA (ANTHROPIC_API_KEY) na Vercel.', code: 'NOT_CONFIGURED' }, { status: 503 })
    }
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 })
    const { message, voice } = parsed.data

    if (await monthlyUsage(ctx.db, ctx.companyId) >= settings.monthly_limit) {
        return NextResponse.json({ error: 'A Alice atingiu o limite de respostas deste mês. O administrador pode aumentar o limite na página da Alice.' }, { status: 429 })
    }

    // Conversation: the caller's own, or a new one.
    let conversationId = parsed.data.conversationId
    if (conversationId) {
        const { data: conv } = await ctx.db
            .from('alice_conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('company_id', ctx.companyId)
            .eq('channel', 'app')
            .eq('user_id', ctx.dbUser.id)
            .maybeSingle()
        if (!conv) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
    } else {
        const { data: conv, error } = await ctx.db
            .from('alice_conversations')
            .insert({ company_id: ctx.companyId, channel: 'app', user_id: ctx.dbUser.id, title: message.slice(0, 80) })
            .select('id')
            .single()
        if (error || !conv) return NextResponse.json({ error: 'Não foi possível iniciar a conversa.' }, { status: 500 })
        conversationId = conv.id as string
    }

    await saveMessage(ctx.db, {
        conversationId: conversationId!,
        companyId: ctx.companyId,
        role: 'user',
        content: [{ type: 'text', text: voice ? `${message}\n\n(mensagem falada; responda de forma breve)` : message }],
        text: message,
        authorUserId: ctx.dbUser.id,
    })

    const name = await storeName(ctx)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller) {
            const send = (e: AgentEvent | { t: 'conversation'; id: string } | { t: 'done' }) => {
                try { controller.enqueue(encoder.encode(JSON.stringify(e) + '\n')) } catch { /* client went away */ }
            }
            send({ t: 'conversation', id: conversationId! })
            try {
                await runAlice({
                    ctx: {
                        db: ctx.db,
                        companyId: ctx.companyId,
                        channel: 'app',
                        conversationId: conversationId!,
                        user: { id: ctx.dbUser.id, role: ctx.role, name: ctx.dbUser.full_name },
                    },
                    storeName: name,
                    emit: send,
                })
            } catch (err) {
                console.error('[alice] chat failed:', err)
                send({ t: 'error', message: describeFailure(err) })
            }
            send({ t: 'done' })
            controller.close()
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Accel-Buffering': 'no',
        },
    })
}
