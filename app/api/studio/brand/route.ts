import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { companyHasFeature, planRequiredResponse } from '@/lib/plan-server'
import { brandOf, cleanBrandInput } from '@/lib/studio/brand'

/** Brand kit for the Studio (companies.settings.brand). Owner and managers. */
export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!['admin', 'owner', 'manager'].includes(ctx.role)) return forbiddenResponse()
    if (!await companyHasFeature(ctx.db, ctx.companyId, 'studio')) return planRequiredResponse('studio')

    const brand = cleanBrandInput(await req.json().catch(() => ({})))
    const { data } = await ctx.db.from('companies').select('name, phone, city, logo_url, settings').eq('id', ctx.companyId).single()
    const settings = (data?.settings ?? {}) as Record<string, unknown>
    const { error } = await ctx.db.from('companies').update({ settings: { ...settings, brand } }).eq('id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(brandOf({ ...data, settings: { ...settings, brand } }))
}
