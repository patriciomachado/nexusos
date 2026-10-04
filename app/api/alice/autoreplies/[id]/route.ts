import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, firstIssue, ownMediaUrl, ruleSchema, uuid } from '@/lib/alice/suite/api'
import { validRegex } from '@/lib/alice/suite/autoreply'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('Regra inválida.')
    const parsed = ruleSchema.partial().safeParse(await req.json().catch(() => null))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const r = parsed.data
    if (r.match_type === 'regex' && r.keyword && !validRegex(r.keyword)) return bad('Expressão regular inválida ou complexa demais.')
    if (r.media_url && (!r.media_type || !ownMediaUrl(r.media_url, ctx.companyId))) return bad('Arquivo inválido. Envie o anexo pela tela.')
    const { data, error } = await ctx.db.from('alice_auto_replies').update({ ...r, ...(r.response !== undefined ? { response: r.response || null } : {}) }).eq('id', id).eq('company_id', ctx.companyId).select('*').maybeSingle()
    if (error) return bad('Não foi possível salvar. A regra precisa ter resposta ou anexo.', 400)
    if (!data) return bad('Regra não encontrada.', 404)
    return NextResponse.json({ rule: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('Regra inválida.')
    await ctx.db.from('alice_auto_replies').delete().eq('id', id).eq('company_id', ctx.companyId)
    return NextResponse.json({ ok: true })
}
