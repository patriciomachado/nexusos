import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get('from') || new Date().toISOString().split('T')[0]
    const dateTo = searchParams.get('to') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    const { data, error } = await db
        .from('appointments')
        .select('*, technicians(name), customers(name), service_orders(title, status)')
        .eq('company_id', user?.company_id)
        .gte('scheduled_date', dateFrom)
        .lte('scheduled_date', dateTo)
        .order('scheduled_date')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const body = await req.json()
    const { data, error } = await db.from('appointments').insert({ ...body, company_id: user?.company_id }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
