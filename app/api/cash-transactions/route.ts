import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { cashTransactionSchema } from '@/lib/validations/schemas'

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
        .select('status, company_id')
        .eq('id', validatedData.cash_register_id)
        .single()

    if (!cashRegister || cashRegister.status === 'closed' || cashRegister.company_id !== ctx.companyId) {
        return NextResponse.json({ error: 'Caixa inválido, já fechado ou pertence a outra empresa.' }, { status: 400 })
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
            payment_methods(name),
            transaction_types(name)
        `)
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false })

    if (registerId) {
        query = query.eq('cash_register_id', registerId)
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

