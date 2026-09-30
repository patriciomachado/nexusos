import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { findOpenRegister } from '@/lib/cash/server'

/**
 * Buys the evaluated device: it enters stock "em revisão" with the paid
 * price as cost; paid from the register (cash exit) or outside it.
 * PATCH { status: 'recusado' } declines the offer.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId, dbUser } = ctx
    const body = await req.json().catch(() => ({})) as { price?: number; from?: 'cash' | 'bank'; payment_method_id?: string; brand?: string; model?: string; storage?: string; cash_price?: number }

    const { data: t } = await db.from('device_trade_ins').select('*').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!t) return NextResponse.json({ error: 'Avaliação não encontrada.' }, { status: 404 })
    if (t.status === 'comprado') return NextResponse.json({ error: 'Este aparelho já foi comprado.' }, { status: 400 })
    const price = Math.round((Number(body.price) || Number(t.offered_price) || 0) * 100) / 100

    const [brandGuess, ...rest] = String(t.device_model).split(' ')
    const checklist = (t.assessment_checklist ?? {}) as { battery_health?: number }
    const { data: device, error: devErr } = await db.from('devices').insert({
        company_id: companyId,
        user_id: dbUser.id,
        brand: body.brand || brandGuess || 'Aparelho',
        model: body.model || rest.join(' ') || t.device_model,
        storage: body.storage || null,
        condition: 'seminovo_b',
        battery_health: checklist.battery_health ?? null,
        imei_1: t.imei || null,
        cost_price: price,
        cash_price: Number(body.cash_price) || Math.round(price * 1.35),
        installment_price: Math.round((Number(body.cash_price) || price * 1.35) * 1.12),
        status: 'em_revisao',
        images: Array.isArray(t.photos) ? t.photos : [],
        notes: `Comprado de ${t.customer_name}${t.notes ? ` · ${t.notes}` : ''}`,
        trade_in_id: t.id,
    }).select('id').single()
    if (devErr) return NextResponse.json({ error: devErr.message }, { status: 500 })

    if (body.from !== 'bank') {
        const register = await findOpenRegister(db, companyId, dbUser.id)
        if (register) {
            let methodId = body.payment_method_id ?? null
            if (!methodId) {
                const { data: cash } = await db.from('payment_methods').select('id').eq('code', 'CASH').limit(1).maybeSingle()
                methodId = cash?.id ?? null
            }
            await db.from('cash_transactions').insert({
                company_id: companyId, cash_register_id: register.id, type: 'exit', amount: price, payment_method_id: methodId,
                description: `Compra de aparelho: ${t.device_model} (${t.customer_name})`, source_type: 'device_purchase', source_id: device.id, user_id: dbUser.id,
            })
        }
    }
    await db.from('device_trade_ins').update({ status: 'comprado', offered_price: price, device_id: device.id }).eq('id', id).eq('company_id', companyId)
    return NextResponse.json({ ok: true, device_id: device.id })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const body = await req.json().catch(() => ({})) as { status?: string }
    if (body.status !== 'recusado' && body.status !== 'avaliado') return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    const { error } = await ctx.db.from('device_trade_ins').update({ status: body.status }).eq('id', id).eq('company_id', ctx.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
