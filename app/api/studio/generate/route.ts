import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { companyHasFeature, planRequiredResponse } from '@/lib/plan-server'
import { rateLimit } from '@/lib/security-rate-limit'
import { brandOf } from '@/lib/studio/brand'
import { CHANNELS, type Channel } from '@/lib/studio/sources'
import { aiConfigured, loadSource, studioLimit, studioUsage, writeWithAi } from '@/lib/studio/server'

/**
 * Writes ONE text (one channel) with AI, on request. Ready-made texts and the
 * art never come here. Counted against the plan's monthly cap.
 */
export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!await companyHasFeature(ctx.db, ctx.companyId, 'studio')) return planRequiredResponse('studio')
    if (!aiConfigured()) return NextResponse.json({ error: 'A IA não está configurada neste servidor.' }, { status: 503 })

    const body = await req.json().catch(() => ({})) as { channel?: unknown; source?: unknown; note?: unknown }
    const channel = CHANNELS.find(c => c.id === body.channel)?.id as Channel | undefined
    if (!channel) return NextResponse.json({ error: 'Canal inválido' }, { status: 400 })

    if (!rateLimit('studio-ai', 6, 60_000, ctx.companyId)) {
        return NextResponse.json({ error: 'Muitos pedidos seguidos. Espere um minuto.' }, { status: 429 })
    }

    const { db, companyId } = ctx
    const [limit, used] = await Promise.all([studioLimit(db, companyId), studioUsage(db, companyId)])
    if (used >= limit) {
        return NextResponse.json({ error: `Você já usou os ${limit} textos com IA deste mês. Os textos prontos e as artes continuam liberados.`, used, limit }, { status: 429 })
    }

    const source = await loadSource(db, companyId, body.source)
    if (!source) return NextResponse.json({ error: 'Origem do post não encontrada' }, { status: 404 })

    const { data: company } = await db.from('companies').select('name, phone, city, logo_url, settings').eq('id', companyId).single()

    try {
        const text = await writeWithAi({
            db, companyId, userId: ctx.dbUser.id, channel, source,
            brand: brandOf(company),
            note: typeof body.note === 'string' ? body.note : undefined,
        })
        if (!text) return NextResponse.json({ error: 'A IA não devolveu texto. Tente de novo.' }, { status: 502 })
        return NextResponse.json({ text, used: used + 1, limit })
    } catch (err) {
        console.error('[studio] AI error:', err)
        return NextResponse.json({ error: 'Não foi possível escrever com a IA agora. Tente de novo em instantes.' }, { status: 502 })
    }
}
