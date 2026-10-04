import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, uuid } from '@/lib/alice/suite/api'

type Params = { params: Promise<{ id: string }> }

/** Cancels a pending message (a message that already went out stays in the history). */
export async function DELETE(_req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('Mensagem inválida.')
    const { data: row } = await ctx.db.from('alice_scheduled_messages').select('status').eq('id', id).eq('company_id', ctx.companyId).maybeSingle()
    if (!row) return bad('Mensagem não encontrada.', 404)
    if (row.status === 'pending' || row.status === 'failed') {
        await ctx.db.from('alice_scheduled_messages').update({ status: 'cancelled' }).eq('id', id).eq('company_id', ctx.companyId)
    }
    return NextResponse.json({ ok: true })
}
