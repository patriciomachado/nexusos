import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { isManager } from '@/lib/cash/server'
import { sendCharge } from '@/lib/messages/charge'

/**
 * Friendly payment reminder to the customer on WhatsApp, sent from the
 * store's number (Alice's connection), with the text set in Configurações →
 * Mensagens automáticas. Without WhatsApp connected, returns a wa.me link
 * with the same text so it can be sent by hand.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { db, companyId } = ctx

    const { data: p } = await db.from('payments')
        .select('id, amount, due_date, notes, payment_status, customer_id, customers(name, phone), service_orders(order_number)')
        .eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!p || p.payment_status !== 'pending') return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })

    const r = await sendCharge(db, companyId, p, { manual: true, userId: ctx.dbUser.id }).catch(err => {
        console.error('[receivables] charge failed:', err)
        return null
    })
    if (r?.reason === 'no_phone') return NextResponse.json({ error: 'O cliente não tem WhatsApp cadastrado.' }, { status: 400 })
    if (!r) return NextResponse.json({ error: 'Não foi possível enviar agora.' }, { status: 500 })
    return NextResponse.json({ sent: r.sent, url: r.url })
}
