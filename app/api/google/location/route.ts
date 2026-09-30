import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { accessToken, friendlyError, getConnection, listLocations } from '@/lib/google/business'

/** The businesses the connected Google account manages. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const conn = await getConnection(ctx.db, ctx.companyId)
    if (!conn) return NextResponse.json({ error: 'Conecte o Google primeiro.' }, { status: 400 })
    try {
        return NextResponse.json({ locations: await listLocations(await accessToken(ctx.db, conn)) })
    } catch (err) {
        return NextResponse.json({ error: friendlyError(err) }, { status: 502 })
    }
}

/** Chooses which business the Pós-venda shows. */
export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const conn = await getConnection(ctx.db, ctx.companyId)
    if (!conn) return NextResponse.json({ error: 'Conecte o Google primeiro.' }, { status: 400 })
    const body = await req.json().catch(() => ({})) as { name?: string }
    try {
        // Only a business this Google account really manages.
        const picked = (await listLocations(await accessToken(ctx.db, conn))).find(l => l.name === body.name)
        if (!picked) return NextResponse.json({ error: 'Empresa não encontrada nesta conta do Google.' }, { status: 400 })
        await ctx.db.from('google_connections').update({
            account_name: picked.account, location_name: picked.name, location_title: picked.title, last_review_check: null, updated_at: new Date().toISOString(),
        }).eq('company_id', ctx.companyId)
        return NextResponse.json({ ok: true })
    } catch (err) {
        return NextResponse.json({ error: friendlyError(err) }, { status: 502 })
    }
}
