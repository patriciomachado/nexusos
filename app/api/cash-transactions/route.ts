import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { cashTransactionSchema } from '@/lib/validations/schemas'
import { isManager, isOwner, loadCashSettings, verifyPin } from '@/lib/cash/server'
import { rateLimit } from '@/lib/security-rate-limit'

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const body = await req.json()
    
    // Validate body
    const result = cashTransactionSchema.safeParse(body)
    if (!result.success) {
        return NextResponse.json({ 
            error: 'Dados inválidos', 
            details: result.error.format() 
        }, { status: 400 })
    }

    const validatedData = result.data

    // Manual sangria/suprimento requires justification
    if ((validatedData.source_type === 'manual_sangria' || validatedData.source_type === 'manual_suprimento') && !validatedData.justification) {
        return NextResponse.json({ error: 'Justificativa é obrigatória para movimentações manuais.' }, { status: 400 })
    }

    // Verify cash register state and ownership
    const { data: cashRegister } = await ctx.db
        .from('cash_registers')
        .select('status, company_id, user_id')
        .eq('id', validatedData.cash_register_id)
        .single()

    if (!cashRegister || cashRegister.status === 'closed' || cashRegister.company_id !== ctx.companyId) {
        return NextResponse.json({ error: 'Caixa inválido, já fechado ou pertence a outra empresa.' }, { status: 400 })
    }

    const manual = validatedData.source_type === 'manual_sangria' || validatedData.source_type === 'manual_suprimento'
    if (manual && cashRegister.user_id !== ctx.dbUser.id && !isManager(ctx.role)) {
        return NextResponse.json({ error: 'Faça a movimentação no seu próprio caixa.' }, { status: 403 })
    }

    // Withdrawals above the store's limit need the owner's PIN (owners don't).
    if (validatedData.source_type === 'manual_sangria' && !isOwner(ctx.role)) {
        const { cash } = await loadCashSettings(ctx.db, ctx.companyId)
        if (cash.sangria_limit > 0 && validatedData.amount > cash.sangria_limit) {
            const pin = typeof body.owner_pin === 'string' ? body.owner_pin : ''
            if (!cash.pin_hash) {
                return NextResponse.json({ error: `Sangria acima de ${cash.sangria_limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} só pelo dono.`, code: 'NEEDS_OWNER' }, { status: 403 })
            }
            if (pin && !rateLimit('owner-pin', 5, 10 * 60_000, ctx.dbUser.id)) {
                return NextResponse.json({ error: 'Muitas tentativas de senha. Espere alguns minutos.', code: 'NEEDS_PIN' }, { status: 429 })
            }
            if (!verifyPin(pin, cash.pin_hash)) {
                return NextResponse.json({ error: pin ? 'Senha do dono incorreta.' : 'Esta sangria precisa da senha do dono.', code: 'NEEDS_PIN' }, { status: 403 })
            }
            validatedData.justification = `${validatedData.justification ?? ''} · autorizada com a senha do dono`.replace(/^ · /, '')
        }
    }

    const { data, error } = await ctx.db
        .from('cash_transactions')
        .insert({
            ...validatedData,
            company_id: ctx.companyId,
            user_id: ctx.dbUser.id,
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const registerId = searchParams.get('cash_register_id')
    const date = searchParams.get('date')
    const limit = searchParams.get('limit')

    // We need to fetch transactions where the cash_register belongs to the user's company
    let query = ctx.db
        .from('cash_transactions')
        .select(`
            *,
            payment_methods(name, code),
            transaction_types(name)
        `)
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false })

    if (registerId) {
        query = query.eq('cash_register_id', registerId)
    }
    // Operators only see the movements of their own registers.
    if (!isManager(ctx.role)) {
        const { data: own } = await ctx.db.from('cash_registers').select('id').eq('company_id', ctx.companyId).eq('user_id', ctx.dbUser.id)
        const ids = (own ?? []).map(r => r.id)
        if (!ids.length) return NextResponse.json({ data: [], count: 0 })
        query = query.in('cash_register_id', ids)
    }

    if (date) {
        // Filter by specific date (YYYY-MM-DD)
        const startOfDay = `${date}T00:00:00.000Z`
        const endOfDay = `${date}T23:59:59.999Z`
        query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    if (limit) {
        query = query.limit(parseInt(limit))
    }

    const { data: transactions, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!transactions || transactions.length === 0) {
        return NextResponse.json({ data: [], count: 0 })
    }

    // Manual Enrichment for Costs (since source_id is not a formal FK)
    const soIds = transactions.filter(t => t.source_type === 'service_order' && t.source_id).map(t => t.source_id)
    const saleIds = transactions.filter(t => t.source_type === 'product_sale' && t.source_id).map(t => t.source_id)

    const [soRes, saleRes] = await Promise.all([
        soIds.length > 0 ? ctx.db.from('service_orders').select('id, parts_cost').in('id', soIds) : Promise.resolve({ data: [] }),
        saleIds.length > 0 ? ctx.db.from('sales').select('id, total_cost').in('id', saleIds) : Promise.resolve({ data: [] })
    ])

    const enrichedTransactions = transactions.map(t => {
        const enriched = { ...t }
        if (t.source_type === 'service_order') {
            enriched.service_orders = soRes.data?.find(so => so.id === t.source_id) || null
        } else if (t.source_type === 'product_sale') {
            enriched.sales = saleRes.data?.find(s => s.id === t.source_id) || null
        }
        return enriched
    })

    return NextResponse.json({ data: enrichedTransactions, count: enrichedTransactions.length })
}

export async function DELETE(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'ID da transação é obrigatório' }, { status: 400 })
    }

    // Verify the transaction belongs to the company
    const { data: transaction } = await ctx.db
        .from('cash_transactions')
        .select('id, company_id, cash_register_id')
        .eq('id', id)
        .single()

    if (!transaction || transaction.company_id !== ctx.companyId) {
        return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    // Verify cash register is still open
    const { data: cashRegister } = await ctx.db
        .from('cash_registers')
        .select('status, user_id')
        .eq('id', transaction.cash_register_id)
        .single()

    if (!cashRegister || cashRegister.status === 'closed') {
        return NextResponse.json({ error: 'Não é possível excluir transações de caixa fechado' }, { status: 400 })
    }
    if (cashRegister.user_id !== ctx.dbUser.id && !isManager(ctx.role)) {
        return NextResponse.json({ error: 'Só quem abriu este caixa ou o gerente pode apagar movimentações.' }, { status: 403 })
    }

    // Clear any service_orders references first to avoid FK constraint errors
    await ctx.db
        .from('service_orders')
        .update({ cash_transaction_id: null })
        .eq('cash_transaction_id', id)

    // Also clear any sale references if they exist
    await ctx.db
        .from('sales')
        .update({ cash_transaction_id: null })
        .eq('cash_transaction_id', id)

    // Delete the transaction
    const { error } = await ctx.db
        .from('cash_transactions')
        .delete()
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Transação removida com sucesso' })
}

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'ID da transação é obrigatório' }, { status: 400 })
    }

    const body = await req.json()
    const { description, amount } = body

    // Verify the transaction belongs to the company
    const { data: transaction } = await ctx.db
        .from('cash_transactions')
        .select('id, company_id, cash_register_id, type')
        .eq('id', id)
        .single()

    if (!transaction || transaction.company_id !== ctx.companyId) {
        return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    // Verify cash register is still open
    const { data: cashRegister } = await ctx.db
        .from('cash_registers')
        .select('status, user_id')
        .eq('id', transaction.cash_register_id)
        .single()

    if (!cashRegister || cashRegister.status === 'closed') {
        return NextResponse.json({ error: 'Não é possível editar transações de caixa fechado' }, { status: 400 })
    }
    if (cashRegister.user_id !== ctx.dbUser.id && !isManager(ctx.role)) {
        return NextResponse.json({ error: 'Só quem abriu este caixa ou o gerente pode corrigir movimentações.' }, { status: 403 })
    }

    // Update the transaction
    const { error } = await ctx.db
        .from('cash_transactions')
        .update({
            ...(description && { description }),
            ...(amount && { amount })
        })
        .eq('id', id)
        .eq('company_id', ctx.companyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Transação atualizada com sucesso' })
}

