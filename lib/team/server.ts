import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface MemberSettings { sales_pct: number; goal: number }
export interface TeamSettings { members: Record<string, MemberSettings>; permissions: Record<string, string[]> }

export async function loadTeamSettings(db: SupabaseClient, companyId: string) {
    const { data } = await db.from('companies').select('settings').eq('id', companyId).single()
    const all = (data?.settings ?? {}) as Record<string, unknown>
    const team = (all.team ?? {}) as Partial<TeamSettings>
    const members: Record<string, MemberSettings> = {}
    for (const [id, m] of Object.entries(team.members ?? {})) {
        members[id] = { sales_pct: Math.min(Math.max(Number(m?.sales_pct) || 0, 0), 100), goal: Math.max(Number(m?.goal) || 0, 0) }
    }
    const permissions: Record<string, string[]> = {}
    for (const [role, list] of Object.entries((all.permissions ?? {}) as Record<string, unknown>)) {
        if (Array.isArray(list)) permissions[role] = list.filter((x): x is string => typeof x === 'string' && x.startsWith('/'))
    }
    return { all, team: { members, permissions } as TeamSettings, revenueGoal: Number(all.revenue_goal) || 0 }
}

/** Month bounds in Brasília time ("2026-09" → ISO instants). */
export function monthRange(month: string) {
    const [y, m] = month.split('-').map(Number)
    const from = new Date(`${month}-01T00:00:00-03:00`).toISOString()
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    const to = new Date(`${next}-01T00:00:00-03:00`).toISOString()
    return { from, to }
}
