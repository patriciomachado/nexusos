import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    // Verify ownership and status
    const { data: cashRegister, error: fetchError } = await db
        .from('cash_registers')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (fetchError || !cashRegister) {
        return NextResponse.json({ error: 'Caixa não encontrado ou acesso negado.' }, { status: 404 })
    }

    if (cashRegister.status === 'closed') {
        return NextResponse.json({ error: 'Este caixa já está fechado.' }, { status: 400 })
    }

    // Calculate closing balance
    const { data: transactions, error: transError } = await db
        .from('cash_transactions')
        .select('type, amount')
        .eq('cash_register_id', id)

    if (transError) return NextResponse.json({ error: transError.message }, { status: 500 })

    let currentBalance = Number(cashRegister.opening_balance)
    transactions.forEach((tx) => {
        if (tx.type === 'entry') {
            currentBalance += Number(tx.amount)
        } else {
            currentBalance -= Number(tx.amount)
        }
    })

    // Update the register
    const { data: updated, error: updateError } = await db
        .from('cash_registers')
        .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            closing_balance: currentBalance
        })
        .eq('id', id)
        .select()
        .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json(updated)
}
