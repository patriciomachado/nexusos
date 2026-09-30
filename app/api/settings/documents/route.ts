import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { cleanDocuments, readDocuments } from '@/lib/settings/documents'

/** How the receipt and the OS print look (Configurações → Recibo e OS). */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { data } = await ctx.db.from('companies').select('settings').eq('id', ctx.companyId).single()
    return NextResponse.json(readDocuments(data?.settings))
}

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const documents = cleanDocuments(await req.json().catch(() => ({})))
    const { data } = await ctx.db.from('companies').select('settings').eq('id', ctx.companyId).single()
    const settings: Record<string, unknown> = { ...((data?.settings ?? {}) as Record<string, unknown>), documents }
    // The old footer key is superseded by documents.receipt_footer.
    delete settings.receipt
    const { error } = await ctx.db.from('companies').update({ settings }).eq('id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(documents)
}
