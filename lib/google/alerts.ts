import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { accessToken, googleConfigured, listReviews, type Connection } from '@/lib/google/business'
import { pushToCompany } from '@/lib/tasks/reminders'

/**
 * Notifies the store's phones about new Google reviews (low ratings first
 * of all, so someone calls the customer the same day). Each connection is
 * checked at most every `everyMinutes`; the first check only sets the mark.
 */
export async function alertNewReviews(db: SupabaseClient, everyMinutes = 30) {
    if (!googleConfigured()) return 0
    const since = new Date(Date.now() - everyMinutes * 60_000).toISOString()
    const { data, error } = await db.from('google_connections')
        .select('*')
        .not('location_name', 'is', null)
        .or(`last_review_check.is.null,last_review_check.lt.${since}`)
        .limit(50)
    if (error || !data?.length) return 0

    let sent = 0
    for (const conn of data as Connection[]) {
        const checkedAt = new Date().toISOString()
        try {
            const { reviews } = await listReviews(await accessToken(db, conn), conn)
            const fresh = conn.last_review_check ? reviews.filter(r => r.created_at > conn.last_review_check!) : []
            for (const r of fresh.sort((a, b) => a.rating - b.rating).slice(0, 3)) {
                const low = r.rating <= 3
                await pushToCompany(db, conn.company_id, {
                    title: low ? `Avaliação de ${r.rating}★ no Google` : `Nova avaliação ${r.rating}★ no Google`,
                    body: `${r.author}${r.comment ? `: ${r.comment.slice(0, 120)}` : ''}${low ? ' — vale ligar para o cliente hoje.' : ''}`,
                    url: '/post-sales?tab=google',
                    tag: `google-${r.name.split('/').pop()}`,
                })
                sent++
            }
        } catch (err) {
            console.error('[google] review alert failed:', conn.company_id, (err as Error).message)
        }
        await db.from('google_connections').update({ last_review_check: checkedAt }).eq('company_id', conn.company_id)
    }
    return sent
}
