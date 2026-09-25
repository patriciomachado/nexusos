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
    if (typeof body.description === 'string' && body.description.trim()) update.description = body.description.trim().slice(0, 120)
    if (body.amount !== undefined) {
        const a = money(body.amount)
        if (!a) return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
        update.amount = a
    }
    if (body.due_date !== undefined) {
        if (!isDay(body.due_date)) return NextResponse.json({ error: 'Vencimento inválido.' }, { status: 400 })
        update.due_date = body.due_date
    }
    if (body.repeat_monthly !== undefined) update.repeat_monthly = !!body.repeat_monthly
    const { data, error } = await ctx.db.from('bills').update(update).eq('id', id).eq('company_id', ctx.companyId).eq('status', 'open').select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

/** Removes a bill. A paid one also removes its cash exit, when the register is still open. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { data: bill } = await ctx.db.from('bills').select('id, status, cash_transaction_id').eq('id', id).eq('company_id', ctx.companyId).maybeSingle()
    if (!bill) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })
    if (bill.cash_transaction_id) {
        const { data: tx } = await ctx.db.from('cash_transactions').select('cash_register_id').eq('id', bill.cash_transaction_id).maybeSingle()
        const { data: reg } = tx ? await ctx.db.from('cash_registers').select('status').eq('id', tx.cash_register_id).maybeSingle() : { data: null }
        if (reg?.status === 'open') await ctx.db.from('cash_transactions').delete().eq('id', bill.cash_transaction_id).eq('company_id', ctx.companyId)
    }
    const { error } = await ctx.db.from('bills').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('company_id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
