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
        .select('status, user_id')
        .eq('id', cash_register_id)
        .single()

    if (!cashRegister || cashRegister.status === 'closed' || cashRegister.user_id !== user.id) {
        return NextResponse.json({ error: 'Caixa inválido ou já fechado.' }, { status: 400 })
    }

    const { data, error } = await db
        .from('cash_transactions')
        .insert({
            cash_register_id,
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

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id').eq('clerk_id', userId).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let query = db
        .from('cash_transactions')
        .select('*, payment_methods(name), transaction_types(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (registerId) query = query.eq('cash_register_id', registerId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
}
