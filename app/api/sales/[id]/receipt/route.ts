import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { loadReceipt } from '@/lib/pdv/receipt'
import { loadSettings } from '@/lib/alice/config'
import { channelReady, channelSend } from '@/lib/alice/channel'
import { digitsOnly } from '@/lib/alice/phone'

/** Sends the receipt to the customer's WhatsApp (store number), or returns a wa.me link. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const body = await req.json().catch(() => ({})) as { phone?: string }
    const r = await loadReceipt(ctx.db, ctx.companyId, id)
    if (!r) return NextResponse.json({ error: 'Venda não encontrada.' }, { status: 404 })

    let phone = digitsOnly(body.phone || r.customer?.phone)
    if (phone.length < 10) return NextResponse.json({ sent: false, url: `https://wa.me/?text=${encodeURIComponent(r.text)}`, reason: 'no_phone' })
    if (phone.length <= 11) phone = `55${phone}`
    try {
        const alice = await loadSettings(ctx.db, ctx.companyId)
        if (!alice.plan_blocked && channelReady(alice)) {
            await channelSend(alice, phone, r.text)
            return NextResponse.json({ sent: true })
        }
    } catch (err) {
        console.error('[pdv] receipt send failed:', err)
    }
    return NextResponse.json({ sent: false, url: `https://wa.me/${phone}?text=${encodeURIComponent(r.text)}` })
}
