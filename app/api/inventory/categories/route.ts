import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()

    if (!user?.company_id) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const { data, error } = await db
        .from('product_categories')
        .select('*')
        .eq('company_id', user.company_id)
        .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()

    if (!user?.company_id) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const body = await req.json()
    const { name } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { data, error } = await db
        .from('product_categories')
        .insert({ name, company_id: user.company_id })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
