import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { loadReceipt } from '@/lib/pdv/receipt'
import { sendSaleReceipt } from '@/lib/pdv/send'

/** Sends the receipt to the customer's WhatsApp (store number), or returns a wa.me link. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const body = await req.json().catch(() => ({})) as { phone?: string }

    const result = await sendSaleReceipt(ctx.db, ctx.companyId, id, { manual: true, phone: body.phone, userId: ctx.dbUser.id }).catch(err => {
        console.error('[pdv] receipt send failed:', err)
        return null
    })
    if (result?.reason === 'not_found') return NextResponse.json({ error: 'Venda não encontrada.' }, { status: 404 })
    if (result?.reason === 'no_phone' || !result) {
        // Sem telefone: abre o WhatsApp com o recibo pra escolher o contato na hora.
        const r = await loadReceipt(ctx.db, ctx.companyId, id)
        return NextResponse.json({ sent: false, url: `https://wa.me/?text=${encodeURIComponent(r?.text ?? '')}`, reason: 'no_phone' })
    }
    return NextResponse.json({ sent: result.sent, url: result.url })
}
