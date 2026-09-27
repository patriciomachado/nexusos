import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { companyHasFeature, planRequiredResponse } from '@/lib/plan-server'
import { loadSource } from '@/lib/studio/server'

/** One post source with its photos (the Studio lists stay light and load this on open). */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!await companyHasFeature(ctx.db, ctx.companyId, 'studio')) return planRequiredResponse('studio')
    const p = req.nextUrl.searchParams
    const source = await loadSource(ctx.db, ctx.companyId, { type: p.get('type'), id: p.get('id'), topic: p.get('topic') ?? '' })
    if (!source) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json(source)
}
