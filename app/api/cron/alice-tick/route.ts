import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase'
import { processBroadcasts, processScheduled } from '@/lib/alice/suite/engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function authorized(req: NextRequest) {
    const secret = process.env.CRON_SECRET?.trim().replace(/^["']|["']$/g, '')
    if (!secret) return false
    const a = Buffer.from(req.headers.get('authorization') ?? '')
    const b = Buffer.from(`Bearer ${secret}`)
    return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Every minute (called by the WhatsApp server — see whatsapp-server/LEIA-ME.md — or any cron):
 * sends the Alice scheduled messages that are due and advances running broadcasts.
 */
export async function GET(req: NextRequest) {
    if (!authorized(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const db = createAdminClient()
    try {
        const scheduled = await processScheduled(db)
        const broadcast = await processBroadcasts(db, 80_000)
        return NextResponse.json({ ok: true, scheduled, broadcast })
    } catch (err) {
        console.error('[alice-tick] failed:', err)
        return NextResponse.json({ error: 'falhou' }, { status: 500 })
    }
}
