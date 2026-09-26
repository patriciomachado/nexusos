import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { offModules } from '@/lib/modules'
import { toggleableModules } from '@/components/layout/nav-config'

/** Modules turned off for the whole store (Configurações → Módulos). Owner only. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const { data } = await ctx.db.from('companies').select('settings').eq('id', ctx.companyId).single()
    return NextResponse.json({ off: offModules(data?.settings) })
}

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({})) as { off?: unknown }
    if (!Array.isArray(body.off)) return NextResponse.json({ error: 'Lista inválida' }, { status: 400 })
    const allowed = new Set(toggleableModules().flatMap(g => g.items.map(i => i.href)))
    const off = Array.from(new Set(body.off.filter((x): x is string => typeof x === 'string' && allowed.has(x))))

    const { data } = await ctx.db.from('companies').select('settings').eq('id', ctx.companyId).single()
    const settings = (data?.settings ?? {}) as Record<string, unknown>
    const { error } = await ctx.db.from('companies').update({ settings: { ...settings, modules_off: off } }).eq('id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ off })
}
