import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { findOpenRegister } from '@/lib/cash/server'

const METHOD_STRING: Record<string, string> = { CASH: 'dinheiro', PIX: 'pix', DEBIT_CARD: 'cartao_debito', CREDIT_CARD: 'cartao_credito', CHEQUE: 'transferencia', INSTALLMENT: 'crediario' }

/**
 * Sells a device: marks it sold (price, customer, warranty end), records the
 * payment (revenue) and, with a register open, the money in and the device
 * cost out (so the profit shows up in reports).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId, dbUser } = ctx
    const body = await req.json().catch(() => ({})) as { price?: number; customer_id?: string | null; payment_method_id?: string; installments?: number; warranty_months?: number }

    const { data: device } = await db.from('devices').select('*').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!device) return NextResponse.json({ error: 'Aparelho não encontrado.' }, { status: 404 })
    if (device.status === 'vendido') return NextResponse.json({ error: 'Este aparelho já foi vendido.' }, { status: 400 })

    const price = Math.round((Number(body.price) || Number(device.cash_price) || 0) * 100) / 100
    if (price <= 0) return NextResponse.json({ error: 'Informe o valor da venda.' }, { status: 400 })
    const { data: method } = body.payment_method_id
        ? await db.from('payment_methods').select('id, code, name').eq('id', body.payment_method_id).maybeSingle()
        : await db.from('payment_methods').select('id, code, name').eq('code', 'CASH').limit(1).maybeSingle()
    if (!method) return NextResponse.json({ error: 'Escolha a forma de pagamento.' }, { status: 400 })
    const onCredit = (method.code || '').toUpperCase() === 'INSTALLMENT'
    if (onCredit && !body.customer_id) return NextResponse.json({ error: 'Para vender no crediário, escolha o cliente.' }, { status: 400 })

    const months = body.warranty_months !== undefined ? Math.max(0, Math.round(Number(body.warranty_months) || 0)) : Number(device.warranty_months ?? 3)
    const until = new Date()
    until.setMonth(until.getMonth() + months)
    const label = [device.brand, device.model, device.storage].filter(Boolean).join(' ')

    const register = onCredit ? null : await findOpenRegister(db, companyId, dbUser.id)
    if (!onCredit && !register) return NextResponse.json({ error: 'Abra o caixa para registrar a venda.' }, { status: 400 })

    const { error: upErr } = await db.from('devices').update({
        status: 'vendido',
        sold_at: new Date().toISOString(),
        sold_price: price,
        sold_customer_id: body.customer_id || null,
        warranty_months: months,
        warranty_until: months > 0 ? until.toISOString().slice(0, 10) : null,
        updated_at: new Date().toISOString(),
    }).eq('id', id).eq('company_id', companyId)
    if (upErr) return NextResponse.json({ error: upErr.code === '42703' ? 'Falta rodar a atualização do banco (20261001_modulos.sql).' : upErr.message }, { status: 500 })

    await db.from('payments').insert({
        company_id: companyId,
        customer_id: body.customer_id || null,
        amount: price,
        payment_method: METHOD_STRING[(method.code || '').toUpperCase()] ?? 'dinheiro',
        payment_status: onCredit ? 'pending' : 'completed',
        payment_date: new Date().toISOString(),
        due_date: onCredit ? new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10) : null,
        installments: Math.max(1, Math.round(Number(body.installments) || 1)),
        reference_id: id,
        notes: `Venda de aparelho: ${label}`,
        created_by: dbUser.id,
    })

    if (register) {
        const cost = Number(device.cost_price || 0) + Number(device.extra_costs || 0)
        const rows: Record<string, unknown>[] = [{
            company_id: companyId, cash_register_id: register.id, type: 'entry', amount: price, payment_method_id: method.id,
            description: `Venda de aparelho: ${label}`, source_type: 'device_sale', source_id: id, user_id: dbUser.id,
        }]
        if (cost > 0) rows.push({
            company_id: companyId, cash_register_id: register.id, type: 'exit', amount: cost, payment_method_id: method.id,
            description: `Custo do aparelho: ${label}`, source_type: 'device_sale', source_id: id, user_id: dbUser.id,
        })
        const { error } = await db.from('cash_transactions').insert(rows)
        if (error) console.error('[devices] cash entry failed:', error)
    }
    return NextResponse.json({ ok: true, warranty_until: months > 0 ? until.toISOString().slice(0, 10) : null })
}
