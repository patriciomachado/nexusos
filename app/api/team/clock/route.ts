import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'

/**
 * Ponto: GET my punches (or everyone's, for managers with ?all=1) for the
 * last N days; POST punches in or out (the opposite of the last one).
 */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const params = new URL(req.url).searchParams
    const days = Math.min(Math.max(Number(params.get('days')) || 7, 1), 62)
    const all = params.get('all') === '1' && isManager(ctx.role)
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    let q = ctx.db.from('time_clock').select('id, user_id, kind, at, note, users(full_name)').eq('company_id', ctx.companyId).gte('at', since).order('at', { ascending: false }).limit(2000)
    if (!all) q = q.eq('user_id', ctx.dbUser.id)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.code === '42P01' || error.code === 'PGRST205' ? 'Falta rodar a atualização do banco (20261001_modulos.sql).' : error.message }, { status: 500 })
    return NextResponse.json({ data, me: ctx.dbUser.id })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const body = await req.json().catch(() => ({})) as { note?: string }
    const { data: last } = await ctx.db.from('time_clock').select('kind, at').eq('company_id', ctx.companyId).eq('user_id', ctx.dbUser.id).order('at', { ascending: false }).limit(1).maybeSingle()
    // A punch "in" older than 18h without "out" is treated as forgotten: next one is a new "in".
    const stale = last?.kind === 'in' && Date.now() - new Date(last.at).getTime() > 18 * 3_600_000
    const kind = last?.kind === 'in' && !stale ? 'out' : 'in'
    const { data, error } = await ctx.db.from('time_clock').insert({ company_id: ctx.companyId, user_id: ctx.dbUser.id, kind, note: typeof body.note === 'string' ? body.note.slice(0, 200) || null : null }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
