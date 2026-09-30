import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { sendStaffReply } from '@/lib/alice/inbound'
import { WhatsAppError } from '@/lib/alice/whatsapp'

type Params = { params: Promise<{ id: string }> }

const bodySchema = z.object({ text: z.string().trim().min(1).max(4000) })

/** A person answers the customer on WhatsApp from the Alice page; the chat becomes theirs. */
export async function POST(req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    const { id } = await params
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 })

    const { data: conv } = await ctx.db
        .from('alice_conversations')
        .select('id, customer_phone, mode, channel')
        .eq('id', id)
        .eq('company_id', ctx.companyId)
        .eq('channel', 'whatsapp')
        .maybeSingle()
    if (!conv?.customer_phone) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

    try {
        await sendStaffReply(ctx.db, settings, { id: conv.id, customer_phone: conv.customer_phone }, ctx.dbUser.id, parsed.data.text)
    } catch (err) {
        const message = err instanceof WhatsAppError || err instanceof Error ? err.message : 'Não foi possível enviar.'
        return NextResponse.json({ error: message }, { status: 502 })
    }
    if (conv.mode !== 'human') await ctx.db.from('alice_conversations').update({ mode: 'human' }).eq('id', id)
    return NextResponse.json({ ok: true, mode: 'human' })
}
