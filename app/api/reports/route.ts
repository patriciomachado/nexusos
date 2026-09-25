import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getContext, unauthorizedResponse, forbiddenResponse } from '@/lib/security'
import { computeReport } from '@/lib/reports/compute'
import { diffDays, dateStringInZone, DEFAULT_TIMEZONE } from '@/lib/tasks/dates'

export const maxDuration = 60

/** Reports are for managers and owners (same rule as the page). */
const ROLES = ['admin', 'owner', 'manager']
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!ROLES.includes(ctx.role)) return forbiddenResponse()

    const today = dateStringInZone(DEFAULT_TIMEZONE)
    const from = req.nextUrl.searchParams.get('from') ?? `${today.slice(0, 7)}-01`
    const to = req.nextUrl.searchParams.get('to') ?? today
    if (!day.safeParse(from).success || !day.safeParse(to).success || from > to) {
        return NextResponse.json({ error: 'Período inválido.' }, { status: 400 })
    }
    if (diffDays(from, to) > 366 * 2) return NextResponse.json({ error: 'Escolha um período de até 2 anos.' }, { status: 400 })

    try {
        const report = await computeReport(ctx.db, ctx.companyId, { from, to })
        return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } })
    } catch (err) {
        console.error('[reports] failed:', err)
        return NextResponse.json({ error: 'Não foi possível gerar o relatório.' }, { status: 500 })
    }
}

const goalSchema = z.object({ revenue_goal: z.number().min(0).max(100_000_000).nullable() })

/** Monthly revenue goal, stored in companies.settings. */
export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!['admin', 'owner'].includes(ctx.role)) return forbiddenResponse()
    const parsed = goalSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Meta inválida.' }, { status: 400 })
    const { data: company } = await ctx.db.from('companies').select('settings').eq('id', ctx.companyId).single()
    const settings = { ...((company?.settings as Record<string, unknown>) ?? {}), revenue_goal: parsed.data.revenue_goal }
    const { error } = await ctx.db.from('companies').update({ settings }).eq('id', ctx.companyId)
    if (error) return NextResponse.json({ error: 'Não foi possível salvar a meta.' }, { status: 500 })
    return NextResponse.json({ revenue_goal: parsed.data.revenue_goal })
}
