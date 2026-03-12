import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data, error } = await db
        .from('users')
        .select(`
            *,
            company:companies(*)
        `)
        .eq('clerk_id', userId)
        .single()

    if (error) {
        console.error('Error fetching user profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
}
