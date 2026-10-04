import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, uuid } from '@/lib/alice/suite/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('Disparo inválido.')
    const { data: broadcast } = await ctx.db.from('alice_broadcasts').select('*').eq('id', id).eq('company_id', ctx.companyId).maybeSingle()
    if (!broadcast) return bad('Disparo não encontrado.', 404)
    const { data: recipients } = await ctx.db.from('alice_broadcast_recipients').select('id, phone, name, status, error, sent_at').eq('broadcast_id', id).order('status').limit(1000)
    return NextResponse.json({ broadcast, recipients: recipients ?? [] })
}

const actionSchema = z.object({ action: z.enum(['pause', 'resume', 'cancel']) })

export async function PATCH(req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    const parsed = actionSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || !uuid.safeParse(id).success) return bad('Ação inválida.')
    const { action } = parsed.data
    const q = ctx.db.from('alice_broadcasts').update(
        action === 'cancel' ? { status: 'cancelled', completed_at: new Date().toISOString() } : { status: action === 'pause' ? 'paused' : 'running' },
    ).eq('id', id).eq('company_id', ctx.companyId)
    const { data } = await (action === 'cancel' ? q.in('status', ['running', 'paused']) : action === 'pause' ? q.eq('status', 'running') : q.eq('status', 'paused')).select('*')
    if (!data?.length) return bad('Este disparo não pode mais ser alterado.', 409)
    return NextResponse.json({ broadcast: data[0] })
}
