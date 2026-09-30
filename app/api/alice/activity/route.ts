import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { effectiveStatus } from '@/lib/alice/config'

/** Audit trail: every lookup and action Alice made, newest first (admin only). */
export async function GET(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const kind = req.nextUrl.searchParams.get('kind')
    let q = ctx.db
        .from('alice_actions')
        .select('id, tool, kind, status, summary, error, channel, created_at, decided_at, conversation_id, users(full_name)')
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false })
        .limit(150)
    if (kind === 'write' || kind === 'read') q = q.eq('kind', kind)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: 'Não foi possível carregar a atividade.' }, { status: 500 })
    return NextResponse.json({
        activity: (data ?? []).map(a => ({
            ...a,
            status: effectiveStatus(a.status, a.created_at),
            user: (Array.isArray(a.users) ? a.users[0] : a.users)?.full_name ?? null,
            users: undefined,
        })),
    })
}
