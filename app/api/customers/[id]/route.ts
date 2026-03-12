import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

type P = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: P) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const { data } = await db.from('customers').select('*, service_orders(id, order_number, title, status, created_at)').eq('id', id).eq('company_id', user?.company_id).single()
    return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: P) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const body = await req.json()
    const { data, error } = await db.from('customers').update(body).eq('id', id).eq('company_id', user?.company_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: P) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    await db.from('customers').update({ is_active: false }).eq('id', id).eq('company_id', user?.company_id)
    return NextResponse.json({ success: true })
}
