import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Check if there's already an open cash register
    const { data: openRegister } = await db
        .from('cash_registers')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle()

    if (openRegister) {
        return NextResponse.json({ error: 'Já existe um caixa aberto para este usuário.' }, { status: 400 })
    }

    const { opening_balance } = await req.json()

    if (typeof opening_balance !== 'number' || opening_balance < 0) {
        return NextResponse.json({ error: 'Saldo inicial inválido.' }, { status: 400 })
    }

    const { data, error } = await db
        .from('cash_registers')
        .insert({
            user_id: user.id,
            opening_balance,
            status: 'open',
            opened_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
}
