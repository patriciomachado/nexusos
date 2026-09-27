import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { bad, firstIssue, partsContext } from '@/lib/parts/server'
import { createPartQuote, findQuoteOptions } from '@/lib/parts/quotes'
import { appUrl } from '@/lib/alice/config'

const schema = z.object({
    device_model: z.string().trim().min(1, 'Informe o aparelho'),
    service: z.string().trim().min(2, 'Informe o serviço'),
})

/** Gera um link de orçamento (/orcamento/[token]) pros preços já cadastrados desse aparelho/serviço. */
export async function POST(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const { db, companyId } = g.ctx
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const found = await findQuoteOptions(db, companyId, parsed.data.device_model, parsed.data.service)
    if (!found) return bad('Nenhum preço cadastrado pra esse aparelho e serviço', 404)
    const token = await createPartQuote(db, companyId, { deviceModel: found.deviceModel, service: parsed.data.service, options: found.options })
    if (!token) return bad('Não foi possível gerar o link agora', 500)
    return NextResponse.json({ url: `${appUrl()}/orcamento/${token}` })
}
