import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = params
    const body = await req.json()
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    // Check if it's a system default or company specific
    const { data: pm } = await db.from('payment_methods').select('*').eq('id', id).single()

    if (pm?.company_id === null) {
        // System default: We can't actually edit it directly, we create a "shadow" copy for them or just flip the active state for the company
        // For simplicity: We will only allow disabling/enabling system defaults IF we have a way to track the company/pm relation.
        // Actually, let's keep it simple: System defaults are shared. If a company wants to customize, they can ADD their own.
        // But the user said: "administrador que decide quais meios vai aceitar"
        // Better: We'll have a mapping table if needs to be more complex. 
        // For now: Just allow updating if company_id matches.
        return NextResponse.json({ error: 'Não é possível editar meios de pagamento do sistema. Crie um novo personalizado.' }, { status: 403 })
    }

    if (pm?.company_id !== user.company_id) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { data, error } = await db
        .from('payment_methods')
        .update({
            name: body.name,
            is_active: body.is_active
        })
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = params
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const { data: pm } = await db.from('payment_methods').select('*').eq('id', id).single()

    if (pm?.company_id === null) {
        return NextResponse.json({ error: 'Não é possível excluir meios de pagamento do sistema.' }, { status: 403 })
    }

    if (pm?.company_id !== user.company_id) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { error } = await db.from('payment_methods').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
