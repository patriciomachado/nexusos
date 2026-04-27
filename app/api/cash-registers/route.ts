import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    // List all cash registers for the company, ordered by opened_at
    const { data, error, count } = await db
        .from('cash_registers')
        .select(`
            *,
            users!user_id (name)
        `, { count: 'exact' })
        .eq('company_id', user.company_id)
        .order('opened_at', { ascending: false })
        .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data, count })
}
