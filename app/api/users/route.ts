import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { createUserSchema } from '@/lib/validations/schemas'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx

    // Fetch all users from the same company
    const { data, error } = await db
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, role: currentUserRole } = ctx

    if (currentUserRole !== 'admin' && currentUserRole !== 'manager') {
        return NextResponse.json({ error: 'Apenas administradores ou gerentes podem adicionar membros' }, { status: 403 })
    }

    const body = await req.json()
    const validation = createUserSchema.safeParse(body)
    
    if (!validation.success) {
        const errors = Object.entries(validation.error.flatten().fieldErrors).map(([field, msgs]) => `${field}: ${msgs?.join(', ')}`).join('; ')
        return NextResponse.json({ error: errors || 'Dados inválidos' }, { status: 400 })
    }

    const { data, error } = await db.from('users').insert({
        ...validation.data,
        clerk_id: validation.data.clerk_id || `temp_${Date.now()}`,
        company_id: companyId,
        is_active: true
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
