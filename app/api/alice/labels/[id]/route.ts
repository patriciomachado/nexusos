import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, firstIssue, labelSchema, uuid } from '@/lib/alice/suite/api'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    const parsed = labelSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || !uuid.safeParse(id).success) return bad(parsed.success ? 'Etiqueta inválida.' : firstIssue(parsed.error))
    const { data, error } = await ctx.db.from('alice_labels').update(parsed.data).eq('id', id).eq('company_id', ctx.companyId).select('id, name, color').maybeSingle()
    if (error) return bad(error.code === '23505' ? 'Já existe uma etiqueta com esse nome.' : 'Não foi possível salvar.', error.code === '23505' ? 409 : 500)
    if (!data) return bad('Etiqueta não encontrada.', 404)
    return NextResponse.json({ label: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('Etiqueta inválida.')
    await ctx.db.from('alice_labels').delete().eq('id', id).eq('company_id', ctx.companyId)
    return NextResponse.json({ ok: true })
}
