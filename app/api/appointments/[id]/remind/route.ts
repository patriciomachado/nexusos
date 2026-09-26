import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { remindAppointment } from '@/lib/appointments/reminder'

/** Reminder to the customer now: from the store's WhatsApp, or a wa.me link. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { data: a } = await ctx.db.from('appointments')
        .select('id, scheduled_date, title, customer_id, customers(name, phone)')
        .eq('id', id).eq('company_id', ctx.companyId).maybeSingle()
    if (!a) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const r = await remindAppointment(ctx.db, ctx.companyId, a, { userId: ctx.dbUser.id, force: !!body.force })
    if ('reason' in r && r.reason === 'no_phone') return NextResponse.json({ error: 'O cliente não tem WhatsApp cadastrado.' }, { status: 400 })
    return NextResponse.json(r)
}
