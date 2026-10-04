import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, uuid } from '@/lib/alice/suite/api'

const schema = z.object({ blocked: z.boolean().optional(), name: z.string().trim().max(120).nullable().optional() })

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || !uuid.safeParse(id).success) return bad('Dados inválidos.')
    const { data } = await ctx.db.from('alice_wa_contacts').update(parsed.data).eq('id', id).eq('company_id', ctx.companyId).select('id, blocked, name').maybeSingle()
    if (!data) return bad('Contato não encontrado.', 404)
    return NextResponse.json({ contact: data })
}
