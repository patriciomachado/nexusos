import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, firstIssue, mediaFields, ownMediaUrl } from '@/lib/alice/suite/api'
import { targetOf } from '@/lib/alice/suite/media'
import { waPhone } from '@/lib/customers/messages'

const schema = z.object({
    target: z.string().trim().min(1, 'Informe para quem enviar.'),
    target_name: z.string().trim().max(120).nullable().optional(),
    content: z.string().trim().max(4000).nullable().optional(),
    send_at: z.string().datetime({ offset: true, message: 'Data e hora inválidas.' }),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
    ...mediaFields,
})

export async function GET() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { data, error } = await ctx.db.from('alice_scheduled_messages').select('*').eq('company_id', ctx.companyId).neq('status', 'cancelled').order('send_at', { ascending: false }).limit(200)
    if (error) return bad('Não foi possível carregar. Rodou a migration 20261010_alice_whatsapp_suite.sql?', 500)
    return NextResponse.json({ messages: data ?? [] })
}

export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const m = parsed.data
    if (!m.content && !m.media_url) return bad('Escreva a mensagem ou anexe um arquivo.')
    if (m.media_url && (!m.media_type || !ownMediaUrl(m.media_url, ctx.companyId))) return bad('Arquivo inválido. Envie o anexo pela tela.')
    const target = m.target.includes('@') ? (m.target.endsWith('@g.us') ? m.target : null) : waPhone(m.target)
    if (!target) return bad('Número inválido. Use DDD + número (ex.: 48 99999-9999).')
    if (new Date(m.send_at).getTime() < Date.now() - 60_000) return bad('Escolha um horário no futuro.')
    const { data, error } = await ctx.db.from('alice_scheduled_messages').insert({
        company_id: ctx.companyId, target: targetOf(target), target_name: m.target_name ?? null, content: m.content || null,
        media_url: m.media_url ?? null, media_type: m.media_type ?? null, media_name: m.media_name ?? null,
        send_at: m.send_at, recurrence: m.recurrence, created_by: ctx.dbUser.id,
    }).select('*').single()
    if (error) return bad('Não foi possível agendar.', 500)
    return NextResponse.json({ message: data })
}
