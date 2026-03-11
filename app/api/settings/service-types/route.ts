import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const db = createAdminClient()
        const { data: user, error: userError } = await db.from('users').select('company_id').eq('clerk_id', userId).single()

        if (userError || !user?.company_id) {
            return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
        }

        const { data, error } = await db
            .from('service_types')
            .select('*')
            .eq('company_id', user.company_id)
            .order('name')

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await req.json()
        const db = createAdminClient()
        const { data: user, error: userError } = await db.from('users').select('company_id').eq('clerk_id', userId).single()

        if (userError || !user?.company_id) {
            return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
        }

        const { data, error } = await db
            .from('service_types')
            .insert({
                name: body.name,
                description: body.description,
                base_price: body.base_price || 0,
                company_id: user.company_id
            })
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
