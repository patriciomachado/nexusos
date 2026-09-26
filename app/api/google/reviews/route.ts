import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'
import { accessToken, friendlyError, getConnection, googleConfigured, listReviews } from '@/lib/google/business'
import { buildMatcher, type CustomerLite } from '@/lib/google/match'

export const dynamic = 'force-dynamic'

/**
 * The store's Google reviews, newest first, each with the customer it
 * probably is (same name in Clientes) and that customer's last OS.
 */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role) && !isOwner(ctx.role)) return forbiddenResponse()
    const { db, companyId } = ctx

    if (!googleConfigured()) return NextResponse.json({ state: 'not_configured' })
    const conn = await getConnection(db, companyId)
    if (!conn) return NextResponse.json({ state: 'disconnected' })
    if (!conn.location_name) return NextResponse.json({ state: 'choose_location', email: conn.google_email })

    try {
        const tok = await accessToken(db, conn)
        const page = await listReviews(tok, conn, req.nextUrl.searchParams.get('pageToken') ?? undefined)

        const { data: customers } = await db.from('customers').select('id, name, phone').eq('company_id', companyId).limit(10000)
        const match = buildMatcher((customers ?? []) as CustomerLite[])
        const matched = page.reviews.map(r => ({ ...r, match: r.author === 'Anônimo' ? null : match(r.author) }))

        const ids = [...new Set(matched.flatMap(r => (r.match ? [r.match.customer.id] : [])))]
        const lastOs = new Map<string, { id: string; order_number: string; title: string; date: string }>()
        if (ids.length) {
            const { data: orders } = await db.from('service_orders')
                .select('id, order_number, title, customer_id, created_at')
                .eq('company_id', companyId).in('customer_id', ids)
                .order('created_at', { ascending: false }).limit(500)
            for (const o of orders ?? []) {
                if (!lastOs.has(o.customer_id)) lastOs.set(o.customer_id, { id: o.id, order_number: String(o.order_number), title: String(o.title ?? ''), date: o.created_at })
            }
        }

        return NextResponse.json({
            state: 'ok',
            location: conn.location_title,
            email: conn.google_email,
            average: page.average,
            total: page.total,
            nextPageToken: page.nextPageToken,
            reviews: matched.map(r => ({ ...r, last_os: r.match ? lastOs.get(r.match.customer.id) ?? null : null })),
        })
    } catch (err) {
        console.error('[google] reviews failed:', (err as Error).message)
        return NextResponse.json({ state: 'error', error: friendlyError(err), location: conn.location_title })
    }
}
