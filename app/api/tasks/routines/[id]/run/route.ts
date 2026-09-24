import { NextRequest, NextResponse } from 'next/server'
import { requireTaskAccess, dbError } from '@/lib/tasks/access'
import { routineRunSchema, firstError } from '@/lib/tasks/schemas'

type P = { params: Promise<{ id: string }> }

/** Checks or unchecks one step of a routine for a given day. */
export async function POST(req: NextRequest, { params }: P) {
    const { ctx, response } = await requireTaskAccess()
    if (response) return response
    const { db, companyId } = ctx
    const { id } = await params

    const body = await req.json().catch(() => null)
    const parsed = routineRunSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 })
    const { date, step_id, done } = parsed.data

    const { data: routine, error: routineError } = await db
        .from('task_routines')
        .select('id, steps')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()
    if (routineError) return dbError(routineError)
    if (!routine) return NextResponse.json({ error: 'Rotina não encontrada' }, { status: 404 })

    const stepIds = ((routine.steps ?? []) as { id: string }[]).map(s => s.id)
    if (!stepIds.includes(step_id)) return NextResponse.json({ error: 'Passo não encontrado' }, { status: 400 })

    const { data: run } = await db
        .from('task_routine_runs')
        .select('completed_steps')
        .eq('routine_id', id)
        .eq('run_date', date)
        .maybeSingle()

    const set = new Set<string>((run?.completed_steps as string[] | undefined) ?? [])
    if (done) set.add(step_id)
    else set.delete(step_id)
    const completed = stepIds.filter(s => set.has(s))
    const allDone = completed.length === stepIds.length

    const { data, error } = await db
        .from('task_routine_runs')
        .upsert({
            company_id: companyId,
            routine_id: id,
            run_date: date,
            completed_steps: completed,
            completed_at: allDone ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'routine_id,run_date' })
        .select('*')
        .single()
    if (error) return dbError(error)
    return NextResponse.json(data)
}
