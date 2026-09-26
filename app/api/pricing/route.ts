import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'
import { normalizePricing } from '@/lib/pricing'
import { loadPricing, savePricing } from '@/lib/pricing-server'

/** Pricing settings, the hour cost and the service table, for the calculator. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role) && !isOwner(ctx.role)) return forbiddenResponse()
    return NextResponse.json(await loadPricing(ctx.db, ctx.companyId))
}

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    try {
        await savePricing(ctx.db, ctx.companyId, normalizePricing(body))
    } catch {
        return NextResponse.json({ error: 'Não foi possível salvar. Tente de novo.' }, { status: 500 })
    }
    return NextResponse.json(await loadPricing(ctx.db, ctx.companyId))
}
