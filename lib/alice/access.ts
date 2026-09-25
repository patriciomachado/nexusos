import 'server-only'
import { NextResponse } from 'next/server'
import { getContext, unauthorizedResponse, forbiddenResponse } from '@/lib/security'
import { planRequiredResponse } from '@/lib/plan-server'
import { canUseAlice, isAdminRole, loadSettings, type AliceSettings } from './config'

type Ctx = NonNullable<Awaited<ReturnType<typeof getContext>>>
type Result = { ctx: Ctx; settings: AliceSettings; response?: undefined } | { ctx?: undefined; settings?: undefined; response: NextResponse }

function missingTables(error: unknown) {
    const e = error as { code?: string; message?: string } | null
    return e?.code === '42P01' || e?.code === 'PGRST205' || /alice_\w+/.test(e?.message ?? '') && /does not exist|Could not find the table/i.test(e?.message ?? '')
}

export function migrationMissingResponse() {
    return NextResponse.json(
        { error: 'A Alice ainda não foi ativada no banco de dados. Rode a migration 20260925_alice_agent.sql no Supabase.', code: 'MIGRATION_MISSING' },
        { status: 503 }
    )
}

/** App user allowed to talk to Alice (admin always; others per settings). */
export async function requireAliceUser(): Promise<Result> {
    const ctx = await getContext()
    if (!ctx) return { response: unauthorizedResponse() }
    if (!ctx.companyId) return { response: forbiddenResponse() }
    const { error } = await ctx.db.from('alice_settings').select('company_id').limit(1)
    if (error && missingTables(error)) return { response: migrationMissingResponse() }
    const settings = await loadSettings(ctx.db, ctx.companyId)
    if (settings.plan_blocked) return { response: planRequiredResponse('alice') }
    if (!canUseAlice(ctx.role, settings)) {
        return { response: NextResponse.json({ error: settings.enabled ? 'Seu perfil não tem acesso à Alice. Fale com o administrador.' : 'A Alice está desativada nesta loja.' }, { status: 403 }) }
    }
    return { ctx, settings }
}

/** Admin/owner only: configuration, WhatsApp inbox and activity log. */
export async function requireAliceAdmin(): Promise<Result> {
    const ctx = await getContext()
    if (!ctx) return { response: unauthorizedResponse() }
    if (!ctx.companyId || !isAdminRole(ctx.role)) return { response: forbiddenResponse() }
    const { error } = await ctx.db.from('alice_settings').select('company_id').limit(1)
    if (error && missingTables(error)) return { response: migrationMissingResponse() }
    return { ctx, settings: await loadSettings(ctx.db, ctx.companyId) }
}

export async function storeName(ctx: Ctx) {
    const { data } = await ctx.db.from('companies').select('name').eq('id', ctx.companyId).single()
    return (data?.name as string | undefined) ?? 'a loja'
}
