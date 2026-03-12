import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('company_id, role').eq('clerk_id', userId).single()

    if (!currentUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    // Fetch all users from the same company
    const { data, error } = await db
        .from('users')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('full_name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('company_id, role').eq('clerk_id', userId).single()

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        return NextResponse.json({ error: 'Apenas administradores ou gerentes podem adicionar membros' }, { status: 403 })
    }

    const body = await req.json()
    const { email, full_name, role, phone, clerk_id } = body

    if (!email || !role) {
        return NextResponse.json({ error: 'E-mail e cargo são obrigatórios' }, { status: 400 })
    }

    // Note: In a real app, you might want to invite the user via Clerk.
    // Here we create the record in our DB, assuming Clerk handles the actual sign-up flow.
    // If clerk_id is provided (linking an existing user), we use it. 
    // Otherwise, this record might be a placeholder until they sign up.

    const { data, error } = await db.from('users').insert({
        clerk_id: clerk_id || `temp_${Date.now()}`, // Placeholder clerk_id if not provided
        email,
        full_name,
        role,
        phone,
        company_id: currentUser.company_id,
        is_active: true
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
