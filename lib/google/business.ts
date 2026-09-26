import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { appUrl } from '@/lib/alice/config'

/**
 * Google Business Profile: the store connects its Google account once
 * (OAuth), picks the business, and the app reads and answers its reviews.
 * Needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and the project's access
 * to the Business Profile APIs approved by Google.
 */

const SCOPE = 'https://www.googleapis.com/auth/business.manage openid email'
const env = (k: string) => process.env[k]?.trim().replace(/^["']|["']$/g, '') || ''

export const googleConfigured = () => !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET'))
export const redirectUri = () => `${appUrl()}/api/google/callback`

export function authUrl(state: string) {
    const p = new URLSearchParams({
        client_id: env('GOOGLE_CLIENT_ID'),
        redirect_uri: redirectUri(),
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent', // always returns a refresh token
        include_granted_scopes: 'true',
        state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

interface TokenResponse { access_token: string; expires_in: number; refresh_token?: string; id_token?: string; error?: string; error_description?: string }

async function token(body: Record<string, string>): Promise<TokenResponse> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), ...body }),
    })
    const data = await res.json().catch(() => ({})) as TokenResponse
    if (!res.ok || !data.access_token) throw new GoogleError(data.error_description || data.error || 'token', res.status)
    return data
}

export const exchangeCode = (code: string) => token({ code, grant_type: 'authorization_code', redirect_uri: redirectUri() })

/** Email inside the id_token (already verified by Google over TLS). */
export function emailFromIdToken(idToken?: string) {
    try {
        const payload = JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString())
        return typeof payload.email === 'string' ? payload.email : null
    } catch { return null }
}

export class GoogleError extends Error {
    constructor(message: string, public status: number) { super(message) }
}

export interface Connection {
    company_id: string
    refresh_token: string
    access_token: string | null
    expires_at: string | null
    google_email: string | null
    account_name: string | null
    location_name: string | null
    location_title: string | null
    last_review_check: string | null
}

export async function getConnection(db: SupabaseClient, companyId: string): Promise<Connection | null> {
    const { data, error } = await db.from('google_connections').select('*').eq('company_id', companyId).maybeSingle()
    if (error) return null // table missing before the 20261004 migration
    return data as Connection | null
}

/** A valid access token, refreshed and saved when it is about to expire. */
export async function accessToken(db: SupabaseClient, conn: Connection) {
    if (conn.access_token && conn.expires_at && +new Date(conn.expires_at) - Date.now() > 60_000) return conn.access_token
    const t = await token({ refresh_token: conn.refresh_token, grant_type: 'refresh_token' })
    const expires_at = new Date(Date.now() + t.expires_in * 1000).toISOString()
    await db.from('google_connections').update({ access_token: t.access_token, expires_at, updated_at: new Date().toISOString() }).eq('company_id', conn.company_id)
    conn.access_token = t.access_token
    conn.expires_at = expires_at
    return t.access_token
}

export async function revoke(refreshToken: string) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' }).catch(() => {})
}

async function api<T>(accessTok: string, url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${accessTok}`, 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new GoogleError((data as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`, res.status)
    return data as T
}

export interface Location { account: string; name: string; title: string; address: string | null }

/** Every business the connected Google account manages. */
export async function listLocations(tok: string): Promise<Location[]> {
    const { accounts = [] } = await api<{ accounts?: { name: string }[] }>(tok, 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20')
    const out: Location[] = []
    for (const a of accounts) {
        const { locations = [] } = await api<{ locations?: { name: string; title?: string; storefrontAddress?: { addressLines?: string[]; locality?: string } }[] }>(
            tok, `https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title,storefrontAddress&pageSize=100`)
        for (const l of locations) {
            const addr = [l.storefrontAddress?.addressLines?.join(', '), l.storefrontAddress?.locality].filter(Boolean).join(' - ')
            out.push({ account: a.name, name: l.name, title: l.title ?? 'Sem nome', address: addr || null })
        }
    }
    return out
}

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

export interface GoogleReview {
    /** accounts/…/locations/…/reviews/… */
    name: string
    author: string
    photo: string | null
    rating: number
    comment: string | null
    created_at: string
    updated_at: string
    reply: { comment: string; updated_at: string } | null
}

interface RawReview {
    name: string
    reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean }
    starRating?: string
    comment?: string
    createTime: string
    updateTime?: string
    reviewReply?: { comment: string; updateTime: string }
}

/** Google adds "(Translated by Google)" blocks; keep the original text. */
function originalText(comment?: string) {
    if (!comment) return null
    const m = comment.match(/\(Original\)\s*([\s\S]*)$/)
    return (m ? m[1] : comment.split(/\n\n\(Translated by Google\)/)[0]).trim() || null
}

export async function listReviews(tok: string, conn: Pick<Connection, 'account_name' | 'location_name'>, pageToken?: string) {
    const loc = String(conn.location_name).replace(/^.*locations\//, 'locations/')
    const q = new URLSearchParams({ pageSize: '50', orderBy: 'updateTime desc' })
    if (pageToken) q.set('pageToken', pageToken)
    const data = await api<{ reviews?: RawReview[]; averageRating?: number; totalReviewCount?: number; nextPageToken?: string }>(
        tok, `https://mybusiness.googleapis.com/v4/${conn.account_name}/${loc}/reviews?${q}`)
    return {
        average: data.averageRating ?? null,
        total: data.totalReviewCount ?? 0,
        nextPageToken: data.nextPageToken ?? null,
        reviews: (data.reviews ?? []).map((r): GoogleReview => ({
            name: r.name,
            author: r.reviewer?.isAnonymous ? 'Anônimo' : r.reviewer?.displayName || 'Cliente do Google',
            photo: r.reviewer?.profilePhotoUrl ?? null,
            rating: STARS[r.starRating ?? ''] ?? 0,
            comment: originalText(r.comment),
            created_at: r.createTime,
            updated_at: r.updateTime ?? r.createTime,
            reply: r.reviewReply ? { comment: r.reviewReply.comment, updated_at: r.reviewReply.updateTime } : null,
        })),
    }
}

/** Answers (or edits the answer to) a review, publicly on Google. */
export async function replyReview(tok: string, reviewName: string, comment: string) {
    return api<{ comment: string; updateTime: string }>(tok, `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, { method: 'PUT', body: JSON.stringify({ comment }) })
}

export async function deleteReply(tok: string, reviewName: string) {
    await api(tok, `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, { method: 'DELETE' })
}

/** The review name must belong to the connected business. */
export const ownsReview = (conn: Connection, name: string) =>
    !!conn.location_name && name.startsWith(`${conn.account_name}/${String(conn.location_name).replace(/^.*locations\//, 'locations/')}/reviews/`)

/** Messages the owner understands, for the errors Google returns. */
export function friendlyError(err: unknown) {
    const e = err as GoogleError
    if (e?.message === 'invalid_grant' || /invalid_grant|expired or revoked/i.test(e?.message ?? '')) return 'A conexão com o Google expirou. Conecte de novo.'
    if (e?.status === 403 || e?.status === 429) {
        if (/quota|has not been used|disabled|not been approved/i.test(e.message)) return 'O Google ainda não liberou o acesso à API do Perfil da Empresa para este app.'
        return 'Esta conta do Google não tem permissão neste Perfil da Empresa.'
    }
    return 'Não foi possível falar com o Google agora. Tente de novo em instantes.'
}
