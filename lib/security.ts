import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from './supabase'
import { NextResponse } from 'next/server'

export async function getContext() {
    const { userId } = await auth()
    if (!userId) return null

    const db = createAdminClient()
    const { data: user, error } = await db
        .from('users')
        .select('id, company_id, role')
        .eq('clerk_id', userId)
        .single()

    if (error || !user) return null

    return {
        userId,
        dbUser: user,
        companyId: user.company_id,
        role: user.role,
        db
    }
}

export function unauthorizedResponse() {
    return NextResponse.json({ error: 'Acesso não autorizado ou sessão expirada' }, { status: 401 })
}

export function forbiddenResponse() {
    return NextResponse.json({ error: 'Você não tem permissão para realizar esta ação' }, { status: 403 })
}
