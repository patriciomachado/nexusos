import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, firstIssue, ownMediaUrl, ruleSchema } from '@/lib/alice/suite/api'
import { validRegex } from '@/lib/alice/suite/autoreply'

export async function GET() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { data, error } = await ctx.db.from('alice_auto_replies').select('*').eq('company_id', ctx.companyId).order('created_at', { ascending: false })
    if (error) return bad('Não foi possível carregar as respostas. Rodou a migration 20261010_alice_whatsapp_suite.sql?', 500)
    return NextResponse.json({ rules: data ?? [] })
}

export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const parsed = ruleSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const r = parsed.data
    if (!r.response && !r.media_url) return bad('Escreva a resposta ou anexe um arquivo.')
    if (r.match_type === 'regex' && !validRegex(r.keyword)) return bad('Expressão regular inválida ou complexa demais.')
    if (r.media_url && (!r.media_type || !ownMediaUrl(r.media_url, ctx.companyId))) return bad('Arquivo inválido. Envie o anexo pela tela.')
    const { data, error } = await ctx.db.from('alice_auto_replies').insert({ company_id: ctx.companyId, ...r, response: r.response || null }).select('*').single()
    if (error) return bad('Não foi possível salvar.', 500)
    return NextResponse.json({ rule: data })
}
