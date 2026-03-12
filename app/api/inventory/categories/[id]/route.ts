import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()

    if (!user?.company_id) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const { error } = await db
        .from('product_categories')
        .delete()
        .eq('id', id)
        .eq('company_id', user.company_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
