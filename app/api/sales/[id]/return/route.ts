import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'
import { findOpenRegister, isManager } from '@/lib/cash/server'

/**
 * Return (devolução) of some or all items of a sale: products go back to
 * stock, the money goes back to the customer (a cash exit in the register
 * when one is open) and a negative payment keeps revenue right in reports.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId, dbUser, role } = ctx

    const body = await req.json().catch(() => ({})) as { items?: { sale_item_id: string; quantity: number }[]; refund_method_id?: string; reason?: string }
    const wanted = (body.items ?? []).filter(i => i && typeof i.sale_item_id === 'string' && Number(i.quantity) > 0)
    if (!wanted.length) return NextResponse.json({ error: 'Escolha o que vai ser devolvido.' }, { status: 400 })

    const { data: sale } = await db
        .from('sales')
        .select('id, user_id, status, customer_id, discount_amount, total_amount, total_cost, sale_items(id, inventory_item_id, item_name, quantity, unit_price, unit_cost, returned_quantity)')
        .eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!sale) return NextResponse.json({ error: 'Venda não encontrada.' }, { status: 404 })
    if (sale.status === 'cancelled') return NextResponse.json({ error: 'Esta venda já foi devolvida.' }, { status: 400 })
    if (sale.user_id !== dbUser.id && !isManager(role)) return NextResponse.json({ error: 'Só quem vendeu ou o gerente pode devolver.' }, { status: 403 })

    type Item = { id: string; inventory_item_id: string | null; item_name: string; quantity: number; unit_price: number; unit_cost: number | null; returned_quantity: number | null }
    const items = (sale.sale_items ?? []) as Item[]
    // The discount is shared proportionally across the items.
    const gross = Number(sale.total_amount) || items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0)
    const discountRate = gross > 0 ? (Number(sale.discount_amount) || 0) / gross : 0

    let refund = 0, costBack = 0, processed = 0
    const names: string[] = []
    for (const w of wanted) {
        const it = items.find(i => i.id === w.sale_item_id)
        if (!it) return NextResponse.json({ error: 'Item não pertence a esta venda.' }, { status: 400 })
        const left = Number(it.quantity) - Number(it.returned_quantity || 0)
        const qty = Math.min(Number(w.quantity), left)
        if (qty <= 0) continue
        processed++
        refund += qty * Number(it.unit_price) * (1 - discountRate)
        costBack += qty * Number(it.unit_cost || 0)
        names.push(`${qty}× ${it.item_name}`)

        const { error: upErr } = await db.from('sale_items').update({ returned_quantity: Number(it.returned_quantity || 0) + qty }).eq('id', it.id)
        if (upErr) return NextResponse.json({ error: upErr.code === '42703' ? 'Falta rodar a atualização do banco (20261001_modulos.sql).' : upErr.message }, { status: 500 })
        it.returned_quantity = Number(it.returned_quantity || 0) + qty
        if (it.inventory_item_id) {
            const { data: inv } = await db.from('inventory_items').select('quantity_in_stock').eq('id', it.inventory_item_id).eq('company_id', companyId).maybeSingle()
            if (inv) await db.from('inventory_items').update({ quantity_in_stock: Number(inv.quantity_in_stock) + qty }).eq('id', it.inventory_item_id).eq('company_id', companyId)
        }
    }
    refund = Math.round(refund * 100) / 100
    if (!processed) return NextResponse.json({ error: 'Esses itens já foram devolvidos.' }, { status: 400 })

    const all = items.every(i => Number(i.returned_quantity || 0) >= Number(i.quantity))
    await db.from('sales').update({
        status: all ? 'cancelled' : 'completed',
        total_cost: Math.max(0, (Number(sale.total_cost) || 0) - costBack),
        updated_at: new Date().toISOString(),
    }).eq('id', id).eq('company_id', companyId)

    const note = `Devolução: ${names.join(', ')}${body.reason ? ` · ${body.reason}` : ''}`
    let methodId = body.refund_method_id ?? null
    const { data: method } = methodId
        ? await db.from('payment_methods').select('id, code').eq('id', methodId).maybeSingle()
        : await db.from('payment_methods').select('id, code').eq('code', 'CASH').limit(1).maybeSingle()
    methodId = method?.id ?? null
    const METHOD_STRING: Record<string, string> = { CASH: 'dinheiro', PIX: 'pix', DEBIT_CARD: 'cartao_debito', CREDIT_CARD: 'cartao_credito', CHEQUE: 'transferencia' }
    // Negative payment: keeps revenue right in the reports.
    if (refund > 0) await db.from('payments').insert({
        company_id: companyId,
        customer_id: sale.customer_id,
        amount: -refund,
        payment_method: METHOD_STRING[(method?.code ?? '').toUpperCase()] ?? 'dinheiro',
        payment_status: 'completed',
        payment_date: new Date().toISOString(),
        reference_id: id,
        sale_id: id,
        notes: note,
        created_by: dbUser.id,
    })

    let inRegister = false
    const register = refund > 0 ? await findOpenRegister(db, companyId, dbUser.id) : null
    if (register) {
        const { error: txError } = await db.from('cash_transactions').insert({
            company_id: companyId,
            cash_register_id: register.id,
            type: 'exit',
            amount: refund,
            payment_method_id: methodId,
            description: `Devolução · venda #${id.slice(0, 4).toUpperCase()}`,
            source_type: 'refund',
            source_id: id,
            user_id: dbUser.id,
            justification: note,
        })
        inRegister = !txError
    }
    return NextResponse.json({ ok: true, refund, all, in_register: inRegister })
}
