import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()

    // Get user's company
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    // Fetch methods: System defaults (company_id is null) OR Company specific
    const { data, error } = await db
        .from('payment_methods')
        .select('*')
        .or(`company_id.eq.${user.company_id},company_id.is.null`)
        .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const { data, error } = await db
        .from('payment_methods')
        .insert({
            name: body.name,
            code: body.code || body.name.toUpperCase().replace(/\s+/g, '_'),
            company_id: user.company_id,
            is_active: true
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
