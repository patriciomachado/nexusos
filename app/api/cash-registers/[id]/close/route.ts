import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx

    // Verify ownership and status
    const { data: cashRegister, error: fetchError } = await db
        .from('cash_registers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
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
        .eq('company_id', companyId) // Extra safety

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
        .eq('company_id', companyId) // IDOR PROTECTION
        .select()
        .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json(updated)
}

