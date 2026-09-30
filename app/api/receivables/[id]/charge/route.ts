import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { brl, isManager } from '@/lib/cash/server'
import { loadSettings } from '@/lib/alice/config'
import { channelReady, channelSend } from '@/lib/alice/channel'
import { digitsOnly } from '@/lib/alice/phone'

function dayLabel(day: string) {
    const [y, m, d] = day.split('-')
    return `${d}/${m}${y !== String(new Date().getFullYear()) ? `/${y}` : ''}`
}

/**
 * Friendly payment reminder to the customer on WhatsApp, sent from the
 * store's number (Alice's connection). Without WhatsApp connected, returns
 * a wa.me link with the same text so it can be sent by hand.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { db, companyId } = ctx

    const [{ data: p }, { data: company }] = await Promise.all([
        db.from('payments').select('amount, due_date, notes, payment_status, customers(name, phone), service_orders(order_number)').eq('id', id).eq('company_id', companyId).maybeSingle(),
        db.from('companies').select('name, phone').eq('id', companyId).single(),
    ])
    if (!p || p.payment_status !== 'pending') return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })
    const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers
    const os = (Array.isArray(p.service_orders) ? p.service_orders[0] : p.service_orders)?.order_number
    let phone = digitsOnly(customer?.phone)
    if (phone.length < 10) return NextResponse.json({ error: 'O cliente não tem WhatsApp cadastrado.' }, { status: 400 })
    if (phone.length <= 11) phone = `55${phone}`

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const first = (customer?.name ?? '').split(' ')[0]
    const when = p.due_date ? (p.due_date < today ? `que venceu em ${dayLabel(p.due_date)}` : p.due_date === today ? 'que vence hoje' : `que vence em ${dayLabel(p.due_date)}`) : 'em aberto'
    const ref = [os ? `OS ${os}` : null, p.notes].filter(Boolean).join(' · ')
    const text = [
        `Olá${first ? `, ${first}` : ''}! Tudo bem? Aqui é da ${company?.name ?? 'loja'}.`,
        `Passando para lembrar do pagamento de ${brl(Number(p.amount))} ${when}${ref ? ` (${ref})` : ''}.`,
        'Se já pagou, pode desconsiderar. Qualquer dúvida é só responder aqui. Obrigado!',
    ].join('\n')

    try {
        const alice = await loadSettings(db, companyId)
        if (!alice.plan_blocked && channelReady(alice)) {
            await channelSend(alice, phone, text)
            return NextResponse.json({ sent: true })
        }
    } catch (err) {
        console.error('[receivables] charge failed:', err)
    }
    return NextResponse.json({ sent: false, url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}` })
}
