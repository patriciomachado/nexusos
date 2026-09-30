import { NextResponse } from 'next/server'
import { getContext, unauthorizedResponse, forbiddenResponse } from '@/lib/security'

export const TASK_ROLES = ['admin', 'owner']

export const TASK_SELECT = '*, task_reminders(id, remind_at, sent_at)'

type Ctx = NonNullable<Awaited<ReturnType<typeof getContext>>>

/**
 * The Tarefas module is personal to the shop's administrator.
 * Returns the request context, or a response to send back.
 */
export async function requireTaskAccess(): Promise<{ ctx: Ctx; response?: undefined } | { ctx?: undefined; response: NextResponse }> {
    const ctx = await getContext()
    if (!ctx) return { response: unauthorizedResponse() }
    if (!ctx.companyId) return { response: forbiddenResponse() }
    if (!TASK_ROLES.includes(ctx.role)) return { response: forbiddenResponse() }
    return { ctx }
}

export function dbError(error: { message?: string; code?: string } | null, fallback = 'Erro ao acessar o banco de dados') {
    // 42P01: table missing → the migration hasn't been applied yet.
    if (error?.code === '42P01' || error?.code === 'PGRST205' || /relation .* does not exist|Could not find the table/i.test(error?.message ?? '')) {
        return NextResponse.json(
            {
                error: 'O módulo Tarefas ainda não foi ativado no banco de dados. Aplique a migration 20260924_tasks_module.sql no Supabase.',
                code: 'MIGRATION_MISSING',
                // Which table/function is missing, e.g. "Could not find the table 'public.tasks' in the schema cache".
                detail: error?.message,
            },
            { status: 503 }
        )
    }
    console.error('[tasks] database error:', error)
    return NextResponse.json({ error: fallback }, { status: 500 })
}
