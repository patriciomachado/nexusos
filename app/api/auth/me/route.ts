import { NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { data, error } = await ctx.db
        .from('users')
        .select(`
            *,
            company:companies(*)
        `)
        .eq('id', ctx.dbUser.id)
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

