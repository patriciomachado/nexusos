import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin, requireAliceUser } from '@/lib/alice/access'
import { bad, firstIssue, labelSchema } from '@/lib/alice/suite/api'

/** Everyone who can use the inbox sees the labels. */
export async function GET() {
    const access = await requireAliceUser()
    if (access.response) return access.response
    const { ctx } = access
    const { data } = await ctx.db.from('alice_labels').select('id, name, color').eq('company_id', ctx.companyId).order('name')
    return NextResponse.json({ labels: data ?? [] })
}

export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const parsed = labelSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const { data, error } = await ctx.db.from('alice_labels').insert({ company_id: ctx.companyId, ...parsed.data }).select('id, name, color').single()
    if (error) return bad(error.code === '23505' ? 'Já existe uma etiqueta com esse nome.' : 'Não foi possível criar a etiqueta.', error.code === '23505' ? 409 : 500)
    return NextResponse.json({ label: data })
}
