import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { isManager } from '@/lib/cash/server'
import { buildClosingReport, sendClosingReport } from '@/lib/cash/report'

async function access(id: string) {
    if (!idSchema.safeParse(id).success) return { error: NextResponse.json({ error: 'ID inválido' }, { status: 400 }) }
    const ctx = await getContext()
    if (!ctx) return { error: unauthorizedResponse() }
    const { data: reg } = await ctx.db.from('cash_registers').select('user_id').eq('id', id).eq('company_id', ctx.companyId).maybeSingle()
    if (!reg) return { error: NextResponse.json({ error: 'Caixa não encontrado.' }, { status: 404 }) }
    if (reg.user_id !== ctx.dbUser.id && !isManager(ctx.role)) return { error: NextResponse.json({ error: 'Sem permissão.' }, { status: 403 }) }
    return { ctx }
}

/** Closing report as text (for sharing) and numbers. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { ctx, error } = await access(id)
    if (error) return error
    const report = await buildClosingReport(ctx.db, ctx.companyId, id)
    if (!report) return NextResponse.json({ error: 'Caixa não encontrado.' }, { status: 404 })
    return NextResponse.json({ text: report.text, numbers: report.numbers })
}

/** Sends the report again on WhatsApp. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { ctx, error } = await access(id)
    if (error) return error
    return NextResponse.json(await sendClosingReport(ctx.db, ctx.companyId, id))
}
