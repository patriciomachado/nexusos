import { NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { getConnection, revoke } from '@/lib/google/business'

/** Disconnects the store's Google account and revokes the app's access. */
export async function DELETE() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const conn = await getConnection(ctx.db, ctx.companyId)
    if (conn) {
        await revoke(conn.refresh_token)
        await ctx.db.from('google_connections').delete().eq('company_id', ctx.companyId)
    }
    return NextResponse.json({ ok: true })
}
