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
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.role !== undefined) {
        if (!['admin', 'manager', 'technician', 'cashier', 'attendant', 'talento'].includes(body.role)) return NextResponse.json({ error: 'Função inválida' }, { status: 400 })
        if (body.role === 'admin' && currentUser.role !== 'admin') return NextResponse.json({ error: 'Só o dono pode dar acesso de dono.' }, { status: 403 })
        update.role = body.role
    }
    if (body.is_active !== undefined) update.is_active = !!body.is_active
    if (typeof body.full_name === 'string' && body.full_name.trim().length >= 2) update.full_name = body.full_name.trim().slice(0, 120)
    if (body.phone !== undefined) update.phone = typeof body.phone === 'string' ? body.phone.slice(0, 20) || null : null

    const { data, error } = await db
        .from('users')
        .update(update)
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

    try {
        const { error } = await db
            .from('users')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId) // IDOR PROTECTION
            .neq('id', currentUser.id) // Cannot delete yourself

        if (error) {
            // Se houver erro de constraint (23503), desativa o usuário em vez de apagar
            if (error.code === '23503') {
                const { error: updateError } = await db
                    .from('users')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .eq('company_id', companyId)

                if (updateError) throw updateError
                return NextResponse.json({ 
                    success: true, 
                    message: 'O usuário possui histórico e foi desativado em vez de excluído para preservar os dados.' 
                })
            }
            throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

