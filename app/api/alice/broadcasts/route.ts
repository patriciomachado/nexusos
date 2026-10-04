import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { channelReady, isGateway } from '@/lib/alice/channel'
import { bad, firstIssue, mediaFields, ownMediaUrl, uuid } from '@/lib/alice/suite/api'
import { blockedPhones } from '@/lib/alice/suite/contacts'
import { phoneKey } from '@/lib/alice/phone'
import { waPhone } from '@/lib/customers/messages'

const MAX_RECIPIENTS = 1000

const schema = z.object({
    title: z.string().trim().max(120).nullable().optional(),
    message: z.string().trim().min(1, 'Escreva a mensagem.').max(4000),
    delay_min_seconds: z.number().int().min(3).max(600).default(10),
    delay_max_seconds: z.number().int().min(3).max(900).default(30),
    audience: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('customers'), ids: z.array(uuid).max(5000).optional() }),
        z.object({ kind: z.literal('contacts'), ids: z.array(uuid).max(5000).optional() }),
        z.object({ kind: z.literal('numbers'), numbers: z.array(z.string()).max(5000) }),
    ]),
    ...mediaFields,
})

export async function GET() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { data, error } = await ctx.db.from('alice_broadcasts').select('*').eq('company_id', ctx.companyId).order('created_at', { ascending: false }).limit(50)
    if (error) return bad('Não foi possível carregar. Rodou a migration 20261010_alice_whatsapp_suite.sql?', 500)
    return NextResponse.json({ broadcasts: data ?? [] })
}

export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const b = parsed.data
    if (b.delay_max_seconds < b.delay_min_seconds) return bad('O intervalo máximo não pode ser menor que o mínimo.')
    if (settings.plan_blocked || !settings.whatsapp_enabled || !channelReady(settings) || !isGateway(settings)) return bad('Conecte o WhatsApp por QR Code e ative o atendimento antes de fazer um disparo.')
    if (b.media_url && (!b.media_type || !ownMediaUrl(b.media_url, ctx.companyId))) return bad('Arquivo inválido. Envie o anexo pela tela.')

    // Who gets it: always the store's own customers/contacts/numbers, never blocked contacts, one message per person.
    let people: { phone: string | null; name: string | null; customer_id: string | null }[] = []
    if (b.audience.kind === 'customers') {
        let q = ctx.db.from('customers').select('id, name, phone').eq('company_id', ctx.companyId).eq('is_active', true).not('phone', 'is', null).limit(5000)
        if (b.audience.ids?.length) q = q.in('id', b.audience.ids)
        people = ((await q).data ?? []).map(c => ({ phone: c.phone, name: c.name, customer_id: c.id }))
    } else if (b.audience.kind === 'contacts') {
        let q = ctx.db.from('alice_wa_contacts').select('phone, name, push_name, customer_id').eq('company_id', ctx.companyId).eq('blocked', false).limit(5000)
        if (b.audience.ids?.length) q = q.in('id', b.audience.ids)
        people = ((await q).data ?? []).map(c => ({ phone: c.phone, name: c.name ?? c.push_name, customer_id: c.customer_id }))
    } else {
        people = b.audience.numbers.map(n => ({ phone: n, name: null, customer_id: null }))
    }
    const blocked = await blockedPhones(ctx.db, ctx.companyId)
    const seen = new Set<string>()
    const recipients: { phone: string; name: string | null; customer_id: string | null }[] = []
    for (const p of people) {
        const phone = waPhone(p.phone)
        const key = phoneKey(phone)
        if (!phone || !key || seen.has(key) || blocked.has(key)) continue
        seen.add(key)
        recipients.push({ phone, name: p.name, customer_id: p.customer_id })
    }
    if (!recipients.length) return bad('Nenhum número válido para enviar.')
    if (recipients.length > MAX_RECIPIENTS) return bad(`Um disparo aceita até ${MAX_RECIPIENTS} pessoas. Divida em partes para proteger o número da loja.`)

    const { data: broadcast, error } = await ctx.db.from('alice_broadcasts').insert({
        company_id: ctx.companyId, title: b.title ?? null, message: b.message, total: recipients.length,
        media_url: b.media_url ?? null, media_type: b.media_type ?? null, media_name: b.media_name ?? null,
        delay_min_seconds: b.delay_min_seconds, delay_max_seconds: b.delay_max_seconds, created_by: ctx.dbUser.id,
    }).select('*').single()
    if (error || !broadcast) return bad('Não foi possível criar o disparo.', 500)
    for (let i = 0; i < recipients.length; i += 500) {
        const { error: e } = await ctx.db.from('alice_broadcast_recipients').insert(recipients.slice(i, i + 500).map(r => ({ ...r, broadcast_id: broadcast.id, company_id: ctx.companyId })))
        if (e) {
            await ctx.db.from('alice_broadcasts').delete().eq('id', broadcast.id)
            return bad('Não foi possível montar a lista do disparo.', 500)
        }
    }
    return NextResponse.json({ broadcast })
}
