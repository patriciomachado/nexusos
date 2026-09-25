import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'
import { loadTeamSettings } from '@/lib/team/server'

/** Per-person sales commission and goal, per-role hidden pages, the store goal. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { team, revenueGoal } = await loadTeamSettings(ctx.db, ctx.companyId)
    return NextResponse.json({ ...team, revenue_goal: revenueGoal, can_edit_permissions: isOwner(ctx.role) })
}

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({})) as { member?: { id: string; sales_pct?: number; goal?: number }; permissions?: Record<string, string[]>; revenue_goal?: number }
    const { all, team } = await loadTeamSettings(ctx.db, ctx.companyId)
    const next: Record<string, unknown> = { ...all }
    if (body.member?.id) {
        const cur = team.members[body.member.id] ?? { sales_pct: 0, goal: 0 }
        team.members[body.member.id] = {
            sales_pct: body.member.sales_pct !== undefined ? Math.min(Math.max(Number(body.member.sales_pct) || 0, 0), 100) : cur.sales_pct,
            goal: body.member.goal !== undefined ? Math.max(Number(body.member.goal) || 0, 0) : cur.goal,
        }
        next.team = { ...(all.team as object ?? {}), members: team.members }
    }
    if (body.permissions) {
        if (!isOwner(ctx.role)) return forbiddenResponse()
        const clean: Record<string, string[]> = {}
        for (const [role, list] of Object.entries(body.permissions)) {
            if (['admin', 'owner'].includes(role) || !Array.isArray(list)) continue
            clean[role] = list.filter(x => typeof x === 'string' && x.startsWith('/')).slice(0, 50)
        }
        next.permissions = clean
    }
    if (body.revenue_goal !== undefined) {
        if (!isOwner(ctx.role)) return forbiddenResponse()
        next.revenue_goal = Math.max(Number(body.revenue_goal) || 0, 0)
    }
    const { error } = await ctx.db.from('companies').update({ settings: next }).eq('id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
