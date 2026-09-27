import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext, uuid } from '@/lib/parts/server'
import { moveStock } from '@/lib/parts/stock'

type P = { params: Promise<{ id: string }> }

const schema = z.object({
    quantity: z.coerce.number().refine(n => n !== 0 && Math.abs(n) <= 100000, 'Informe a quantidade'),
    notes: z.string().trim().max(300).optional().nullable(),
})

/** Manual stock correction (counted the drawer, lost a part…). */
export async function POST(req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId, dbUser } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const err = await moveStock(db, companyId, { itemId: id, quantity: parsed.data.quantity, reason: 'ajuste', notes: parsed.data.notes || 'Ajuste manual', userId: dbUser.id })
    if (err) return bad(err, err === 'Item não encontrado' ? 404 : 500)
    return NextResponse.json({ success: true })
}
