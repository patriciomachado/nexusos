import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const {
        cash_register_id,
        type,
        amount,
        payment_method_id,
        transaction_type_id,
        description,
        source_type,
        source_id,
        justification
    } = await req.json()

    // Required fields
    if (!cash_register_id || !type || !amount || !payment_method_id) {
        return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }

    // Manual sangria/suprimento requires justification
    if ((source_type === 'manual_sangria' || source_type === 'manual_suprimento') && !justification) {
        return NextResponse.json({ error: 'Justificativa é obrigatória para movimentações manuais.' }, { status: 400 })
    }

    // Verify cash register state
    const { data: cashRegister } = await db
        .from('cash_registers')
        .select('status, company_id')
        .eq('id', cash_register_id)
        .single()

    if (!cashRegister || cashRegister.status === 'closed' || cashRegister.company_id !== user.company_id) {
        return NextResponse.json({ error: 'Caixa inválido ou já fechado.' }, { status: 400 })
    }

    const { data, error } = await db
        .from('cash_transactions')
        .insert({
            cash_register_id,
            company_id: user.company_id,
            type,
            amount,
            payment_method_id,
            transaction_type_id,
            description,
            source_type,
            source_id,
            user_id: user.id,
            justification
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const registerId = searchParams.get('cash_register_id')
    const date = searchParams.get('date')
    const limit = searchParams.get('limit')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // We need to fetch transactions where the cash_register belongs to the user's company
    let query = db
        .from('cash_transactions')
        .select(`
            *,
            payment_methods(name),
            transaction_types(name)
        `)
        .eq('company_id', user.company_id)
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
        soIds.length > 0 ? db.from('service_orders').select('id, parts_cost').in('id', soIds) : Promise.resolve({ data: [] }),
        saleIds.length > 0 ? db.from('sales').select('id, total_cost').in('id', saleIds) : Promise.resolve({ data: [] })
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
