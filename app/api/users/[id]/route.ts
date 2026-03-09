import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('company_id, role').eq('clerk_id', userId).single()

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        return NextResponse.json({ error: 'Only admins or managers can update team members' }, { status: 403 })
    }

    const body = await req.json()
    const { role, is_active } = body

    const { data, error } = await db
        .from('users')
        .update({ role, is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', currentUser.company_id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('company_id, role').eq('clerk_id', userId).single()

    if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can remove team members' }, { status: 403 })
    }

    // Instead of deleting, we usually deactivate or just unlink.
    // For this implementation, we'll allow deleting if they are not the owner.

    const { error } = await db
        .from('users')
        .delete()
        .eq('id', id)
        .eq('company_id', currentUser.company_id)
        .neq('clerk_id', userId) // Cannot delete yourself

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
