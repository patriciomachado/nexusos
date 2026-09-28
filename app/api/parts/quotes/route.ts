import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext } from '@/lib/parts/server'
import { buildFollowUpMessage, buildQuoteMessage, computeQuoteStats, createPartQuote, findQuoteOptions, type PartQuoteOption } from '@/lib/parts/quotes'
import { appUrl } from '@/lib/alice/config'

/** Orçamentos gerados (peças cotadas), com o que virou OS e o que ainda tá parado. */
export async function GET() {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const { data, error } = await db.from('part_quotes')
        .select('id, token, device_model, service, options, valid_until, created_at, service_order_id, service_orders(order_number)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200)
    if (error) return bad(error.message, 500)
    const rows = data ?? []
    const now = Date.now()
    const quotes = rows.map(r => {
        const options = (r.options as PartQuoteOption[]) ?? []
        const link = `${appUrl()}/orcamento/${r.token}`
        const order = Array.isArray(r.service_orders) ? r.service_orders[0] : r.service_orders
        const status = r.service_order_id ? 'convertido' : new Date(r.valid_until).getTime() < now ? 'vencido' : 'aberto'
        return {
            id: r.id, device_model: r.device_model, service: r.service, options, valid_until: r.valid_until, created_at: r.created_at,
            status, order_number: order?.order_number ?? null, link,
            follow_up_message: status === 'aberto' ? buildFollowUpMessage(r.device_model, r.service, link) : null,
        }
    })
    return NextResponse.json({ quotes, stats: computeQuoteStats(rows.map(r => ({ id: r.id, device_model: r.device_model, service: r.service, options: r.options as PartQuoteOption[], valid_until: r.valid_until, created_at: r.created_at, service_order_id: r.service_order_id }))) })
}

const schema = z.object({
    device_model: z.string().trim().min(1, 'Informe o aparelho'),
    service: z.string().trim().min(2, 'Informe o serviço'),
    // Quando vem preenchido (orçamento rápido, cotado na hora), usa direto em vez de olhar a tabela de Peças.
    options: z.array(z.object({ tipo: z.string().trim().max(40).nullable(), valor: z.number().min(0) })).min(1).max(6).optional(),
})

/** Gera um link de orçamento (/orcamento/[token]), a partir da tabela de Peças ou de opções já cotadas na hora. */
export async function POST(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const { device_model, service, options: given } = parsed.data
    const found = given ? { deviceModel: device_model, options: given } : await findQuoteOptions(db, companyId, device_model, service)
    if (!found) return bad('Nenhum preço cadastrado pra esse aparelho e serviço', 404)
    const { deviceModel, options } = found

    const token = await createPartQuote(db, companyId, { deviceModel, service, options })
    if (!token) return bad('Não foi possível gerar o link agora', 500)
    const url = `${appUrl()}/orcamento/${token}`
    return NextResponse.json({ url, message: buildQuoteMessage(deviceModel, service, options, url) })
}
