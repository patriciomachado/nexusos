import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { getContext } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { authUrl, googleConfigured } from '@/lib/google/business'
import { appUrl } from '@/lib/alice/config'

export const dynamic = 'force-dynamic'

/** Sends the owner to Google to allow access to the Business Profile. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return NextResponse.redirect(`${appUrl()}/entrar`)
    if (!isOwner(ctx.role) || !googleConfigured()) return NextResponse.redirect(`${appUrl()}/post-sales?tab=google`)
    const state = randomBytes(24).toString('base64url')
    const res = NextResponse.redirect(authUrl(state))
    res.cookies.set('g_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/google', maxAge: 600 })
    return res
}
