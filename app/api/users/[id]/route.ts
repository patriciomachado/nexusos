import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser: currentUser } = ctx

    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        return NextResponse.json({ error: 'Only admins or managers can update team members' }, { status: 403 })
    }

    const body = await req.json()
    const { role, is_active } = body

    const { data, error } = await db
        .from('users')
        .update({ role, is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId) // IDOR PROTECTION
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser: currentUser } = ctx

    if (currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can remove team members' }, { status: 403 })
    }

    const { error } = await db
        .from('users')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId) // IDOR PROTECTION
        .neq('id', currentUser.id) // Cannot delete yourself

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}

