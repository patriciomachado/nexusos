import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { id } = await params
        const body = await req.json()
        const db = createAdminClient()

        const { data: user, error: userError } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
        if (userError || !user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

        const { data: st, error: fetchError } = await db.from('service_types').select('company_id').eq('id', id).single()
        if (fetchError || !st) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
        if (st.company_id !== user.company_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

        const { data, error } = await db
            .from('service_types')
            .update({
                name: body.name,
                description: body.description,
                base_price: body.base_price
            })
            .eq('id', id)
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { id } = await params
        const db = createAdminClient()

        const { data: user, error: userError } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
        if (userError || !user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

        const { data: st, error: fetchError } = await db.from('service_types').select('company_id').eq('id', id).single()
        if (fetchError || !st) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
        if (st.company_id !== user.company_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

        const { error } = await db.from('service_types').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
