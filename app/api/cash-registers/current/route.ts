import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    // Find the currently open cash register for this user
    const { data: cashRegister, error } = await db
        .from('cash_registers')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(cashRegister)
}
