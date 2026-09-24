import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceUser } from '@/lib/alice/access'
import { executeAction, saveMessage } from '@/lib/alice/agent'
import { ToolError } from '@/lib/alice/tools/types'
import { CONFIRM_WINDOW_MS } from '@/lib/alice/config'

type Params = { params: Promise<{ id: string }> }

const bodySchema = z.object({ decision: z.enum(['confirm', 'reject']) })

/**
 * Confirms or cancels an action Alice prepared. Only the person who asked can
 * decide, only once, and the permission is checked again before running.
 */
export async function POST(req: NextRequest, { params }: Params) {
    const access = await requireAliceUser()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })

    const { data: action } = await ctx.db
        .from('alice_actions')
        .select('id, tool, input, status, summary, created_at, conversation_id, user_id, channel')
        .eq('id', id)
        .eq('company_id', ctx.companyId)
        .maybeSingle()
    if (!action || action.channel !== 'app' || action.user_id !== ctx.dbUser.id) {
        return NextResponse.json({ error: 'Ação não encontrada.' }, { status: 404 })
    }

    // Claim the proposal atomically so a double tap never runs it twice.
    const nextStatus = parsed.data.decision === 'reject'
        ? 'rejected'
        : Date.now() - new Date(action.created_at).getTime() > CONFIRM_WINDOW_MS ? 'expired' : 'executed'
    const { data: claimed, error: claimError } = await ctx.db.rpc('alice_claim_action', { p_id: id, p_user: ctx.dbUser.id, p_status: nextStatus })
    if (claimError) {
        console.error('[alice] claim failed:', claimError)
        return NextResponse.json({ error: 'Não foi possível registrar a decisão.' }, { status: 500 })
    }
    if (!claimed) return NextResponse.json({ error: 'Esta ação já foi decidida.', status: action.status }, { status: 409 })

    const summary = String(action.summary ?? action.tool).replace(/\n/g, ' · ')
    const note = async (text: string) => saveMessage(ctx.db, { conversationId: action.conversation_id, companyId: ctx.companyId, role: 'event', text })

    if (nextStatus === 'rejected') {
        await note(`O usuário cancelou: ${summary}`)
        return NextResponse.json({ status: 'rejected', message: 'Cancelado.' })
    }
    if (nextStatus === 'expired') {
        await note(`A ação expirou sem confirmação: ${summary}`)
        return NextResponse.json({ status: 'expired', message: 'Esta ação expirou. Peça de novo à Alice.' }, { status: 410 })
    }

    try {
        const outcome = await executeAction(
            { db: ctx.db, companyId: ctx.companyId, channel: 'app', conversationId: action.conversation_id, user: { id: ctx.dbUser.id, role: ctx.role, name: ctx.dbUser.full_name } },
            action,
        )
        await ctx.db.from('alice_actions').update({ result: outcome }).eq('id', id)
        await note(`O usuário confirmou e a ação foi executada: ${outcome.message}`)
        return NextResponse.json({ status: 'executed', message: outcome.message, href: outcome.href })
    } catch (err) {
        const message = err instanceof ToolError ? err.message : 'Não foi possível executar a ação.'
        if (!(err instanceof ToolError)) console.error('[alice] action failed:', err)
        await ctx.db.from('alice_actions').update({ status: 'failed', error: message }).eq('id', id)
        await note(`A ação falhou: ${message}`)
        return NextResponse.json({ status: 'failed', message }, { status: 422 })
    }
}
