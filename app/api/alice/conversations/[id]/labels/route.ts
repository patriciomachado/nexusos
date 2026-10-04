import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceUser } from '@/lib/alice/access'
import { bad, uuid } from '@/lib/alice/suite/api'

const schema = z.object({ label_ids: z.array(uuid).max(20) })

/** Replaces the labels of one conversation. Same access as the inbox itself. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const access = await requireAliceUser()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || !uuid.safeParse(id).success) return bad('Dados inválidos.')
    const { data: conv } = await ctx.db.from('alice_conversations').select('id').eq('id', id).eq('company_id', ctx.companyId).in('channel', ['whatsapp', 'instagram']).maybeSingle()
    if (!conv) return bad('Conversa não encontrada.', 404)
    // Only labels of this store.
    const { data: valid } = parsed.data.label_ids.length ? await ctx.db.from('alice_labels').select('id').eq('company_id', ctx.companyId).in('id', parsed.data.label_ids) : { data: [] }
    const ids = (valid ?? []).map(l => l.id as string)
    await ctx.db.from('alice_conversation_labels').delete().eq('conversation_id', id)
    if (ids.length) await ctx.db.from('alice_conversation_labels').insert(ids.map(label_id => ({ conversation_id: id, label_id, company_id: ctx.companyId })))
    return NextResponse.json({ label_ids: ids })
}
