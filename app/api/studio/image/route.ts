import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

/**
 * Serves a photo from the app's own storage through our domain, so the art
 * canvas can draw it and still be exported (cross-origin images would taint
 * the canvas). Only public files of our Supabase storage are allowed.
 */
const MAX_BYTES = 12 * 1024 * 1024

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const raw = req.nextUrl.searchParams.get('url') ?? ''
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    let url: URL
    try { url = new URL(raw) } catch { return NextResponse.json({ error: 'URL inválida' }, { status: 400 }) }
    if (!base || url.origin !== new URL(base).origin || !url.pathname.startsWith('/storage/v1/object/public/')) {
        return NextResponse.json({ error: 'Origem não permitida' }, { status: 400 })
    }

    const res = await fetch(url, { cache: 'no-store' }).catch(() => null)
    const type = res?.headers.get('content-type') ?? ''
    if (!res?.ok || !type.startsWith('image/')) return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: 'Imagem grande demais' }, { status: 413 })

    return new NextResponse(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' } })
}
