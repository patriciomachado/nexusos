import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getContext } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { emailFromIdToken, exchangeCode, listLocations } from '@/lib/google/business'
import { appUrl } from '@/lib/alice/config'

export const dynamic = 'force-dynamic'

const back = (status: string) => {
    const res = NextResponse.redirect(`${appUrl()}/post-sales?tab=google&google=${status}`)
    res.cookies.delete({ name: 'g_oauth_state', path: '/api/google' })
    return res
}

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return NextResponse.redirect(`${appUrl()}/entrar`)
    if (!isOwner(ctx.role)) return back('sem-permissao')

    const q = req.nextUrl.searchParams
    const state = q.get('state') ?? ''
    const cookie = req.cookies.get('g_oauth_state')?.value ?? ''
    const same = state.length > 0 && state.length === cookie.length && timingSafeEqual(Buffer.from(state), Buffer.from(cookie))
    if (!same) return back('expirou')
    if (q.get('error') || !q.get('code')) return back('cancelado')

    try {
        const t = await exchangeCode(q.get('code')!)
        if (!t.refresh_token) return back('erro')
        const row = {
            company_id: ctx.companyId,
            refresh_token: t.refresh_token,
            access_token: t.access_token,
            expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
            google_email: emailFromIdToken(t.id_token),
            account_name: null as string | null,
            location_name: null as string | null,
            location_title: null as string | null,
            connected_by: ctx.dbUser.id,
            updated_at: new Date().toISOString(),
        }
        // One business: pick it now. More than one: the owner chooses in the app.
        const locations = await listLocations(t.access_token).catch(() => [])
        if (locations.length === 1) {
            row.account_name = locations[0].account
            row.location_name = locations[0].name
            row.location_title = locations[0].title
        }
        const { error } = await ctx.db.from('google_connections').upsert(row, { onConflict: 'company_id' })
        if (error) return back(/relation|does not exist/i.test(error.message) ? 'sem-tabela' : 'erro')
        return back('conectado')
    } catch (err) {
        console.error('[google] callback failed:', (err as Error).message)
        return back('erro')
    }
}
