import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { isManager } from '@/lib/cash/server'
import { isDay, money } from '@/lib/cash/bills'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.due_date !== undefined) {
        if (!isDay(body.due_date)) return NextResponse.json({ error: 'Vencimento inválido.' }, { status: 400 })
        update.due_date = body.due_date
    }
    if (body.amount !== undefined) {
        const a = money(body.amount)
        if (!a) return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
        update.amount = a
    }
    const { error } = await ctx.db.from('payments').update(update).eq('id', id).eq('company_id', ctx.companyId).eq('payment_status', 'pending')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

/** Cancels a pending receivable (it stays in the history as cancelled). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { error } = await ctx.db.from('payments').update({ payment_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('company_id', ctx.companyId).eq('payment_status', 'pending')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
