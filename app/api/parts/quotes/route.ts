import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext } from '@/lib/parts/server'
import { buildQuoteMessage, createPartQuote, findQuoteOptions } from '@/lib/parts/quotes'
import { appUrl } from '@/lib/alice/config'

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
