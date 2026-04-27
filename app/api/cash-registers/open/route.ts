import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Check if there's already an open cash register for this company
    const { data: openRegisters, error: checkError } = await db
        .from('cash_registers')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('status', 'open')

    if (checkError) {
        return NextResponse.json({ error: 'Erro ao verificar caixa: ' + checkError.message }, { status: 500 })
    }

    if (openRegisters && openRegisters.length > 0) {
        // Auto-close any orphaned registers to prevent system deadlocks
        await db
            .from('cash_registers')
            .update({ 
                status: 'closed', 
                closed_at: new Date().toISOString(),
                closing_balance: 0,
                final_balance: 0
            })
            .in('id', openRegisters.map(r => r.id))
    }

    const { opening_balance } = await req.json()

    if (typeof opening_balance !== 'number' || opening_balance < 0) {
        return NextResponse.json({ error: 'Saldo inicial inválido.' }, { status: 400 })
    }

    const { data, error } = await db
        .from('cash_registers')
        .insert({
            user_id: user.id,
            company_id: user.company_id,
            opening_balance,
            status: 'open',
            opened_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
}
