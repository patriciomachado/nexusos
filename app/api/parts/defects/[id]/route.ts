import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext, uuid } from '@/lib/parts/server'
import { moveStock } from '@/lib/parts/stock'

type P = { params: Promise<{ id: string }> }

const schema = z.object({ resolution: z.enum(['trocada', 'devolvida', 'prejuizo']) })

/**
 * How the supplier handled it: swapped (a good part comes back into stock),
 * refunded, or the store took the loss.
 */
export async function PATCH(req: NextRequest, { params }: P) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId, dbUser } = g.ctx
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('ID inválido')
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const { data: d } = await db.from('part_defects').update({ resolution: parsed.data.resolution, resolved_at: new Date().toISOString() })
        .eq('id', id).eq('company_id', companyId).eq('resolution', 'pendente').select('inventory_item_id, quantity').maybeSingle()
    if (!d) return bad('Defeito não encontrado ou já resolvido', 404)
    if (parsed.data.resolution === 'trocada') {
        await moveStock(db, companyId, { itemId: d.inventory_item_id, quantity: Number(d.quantity), reason: 'defeito', sourceType: 'part_defect', sourceId: id, userId: dbUser.id, notes: 'Troca do fornecedor' })
    }
    return NextResponse.json({ success: true })
}
