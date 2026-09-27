import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext, priceSchema } from '@/lib/parts/server'
import { loadRepairPrices } from '@/lib/parts/prices'

/** Price table by device and service, with the suggested price from the part cost. */
export async function GET() {
    const g = await partsContext(); if ('error' in g) return g.error
    return NextResponse.json(await loadRepairPrices(g.ctx.db, g.ctx.companyId))
}

export async function POST(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const parsed = priceSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    if (parsed.data.part_item_id) {
        const { data: p } = await db.from('inventory_items').select('id').eq('id', parsed.data.part_item_id).eq('company_id', companyId).maybeSingle()
        if (!p) return bad('Peça não encontrada')
    }
    const { data, error } = await db.from('repair_prices').insert({ ...parsed.data, company_id: companyId }).select('id').single()
    if (error) return bad(error.message, 500)
    return NextResponse.json({ id: data.id }, { status: 201 })
}

const marginSchema = z.object({ margin_pct: z.coerce.number().min(0, 'Margem inválida').max(1000, 'Margem inválida') })

/** Store margin on parts used for the suggested prices. */
export async function PUT(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const parsed = marginSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const { data } = await db.from('companies').select('settings').eq('id', companyId).single()
    const settings = (data?.settings ?? {}) as Record<string, unknown>
    const parts = { ...((settings.parts ?? {}) as Record<string, unknown>), margin_pct: parsed.data.margin_pct }
    const { error } = await db.from('companies').update({ settings: { ...settings, parts } }).eq('id', companyId)
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true })
}
