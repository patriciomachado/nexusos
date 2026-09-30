import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'
import { fill, readyChannel, sendOnce, waPhone } from '@/lib/customers/messages'

const BATCH = 25

/**
 * Sends one message to a list of customers from the store's WhatsApp.
 * At most 25 per call, a little apart (WhatsApp blocks numbers that blast);
 * the screen calls again for the next ones. {nome} is the first name.
 */
export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({})) as { customer_ids?: string[]; text?: string; campaign_id?: string }
    const text = String(body.text ?? '').trim().slice(0, 1000)
    const ids = [...new Set((body.customer_ids ?? []).filter(x => typeof x === 'string'))].slice(0, BATCH)
    if (!text) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 })
    if (!ids.length) return NextResponse.json({ error: 'Escolha os clientes.' }, { status: 400 })

    const alice = await readyChannel(ctx.db, ctx.companyId)
    if (!alice) return NextResponse.json({ error: 'Conecte o WhatsApp da loja em Alice → Configurações para enviar campanhas.', code: 'NO_WHATSAPP' }, { status: 400 })

    const [{ data: customers }, { data: company }] = await Promise.all([
        ctx.db.from('customers').select('id, name, phone').eq('company_id', ctx.companyId).in('id', ids),
        ctx.db.from('companies').select('name').eq('id', ctx.companyId).single(),
    ])
    const campaign = typeof body.campaign_id === 'string' && body.campaign_id ? body.campaign_id : randomUUID()
    let sent = 0, skipped = 0
    for (const c of customers ?? []) {
        const phone = waPhone(c.phone)
        if (!phone) { skipped++; continue }
        const r = await sendOnce(ctx.db, alice, {
            companyId: ctx.companyId, customerId: c.id, phone, kind: 'campaign', ref: `${campaign}:${c.id}`, userId: ctx.dbUser.id,
            text: fill(text, { nome: (c.name ?? '').split(' ')[0] || 'tudo bem', loja: company?.name ?? '' }),
        })
        if (r.sent) sent++; else skipped++
        await new Promise(res => setTimeout(res, 1200))
    }
    return NextResponse.json({ sent, skipped, campaign_id: campaign })
}
