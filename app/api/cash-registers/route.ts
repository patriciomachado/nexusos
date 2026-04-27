import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // List cash registers for the company
    let query = db
        .from('cash_registers')
        .select(`
            *,
            users!user_id (name)
        `, { count: 'exact' })
        .eq('company_id', user.company_id)
        .order('opened_at', { ascending: false })

    if (status) {
        query = query.eq('status', status)
    }

    const { data, error, count } = await query.limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If status=open is requested, return just the object if it exists
    if (status === 'open' && data && data.length > 0) {
        return NextResponse.json(data[0])
    }

    return NextResponse.json({ data, count })
}
