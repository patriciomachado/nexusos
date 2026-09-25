import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'

/**
 * Moves this login into another store it has access to. The current store is
 * remembered first so switching back always works.
 */
export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId, role, userId, dbUser } = ctx
    const body = await req.json().catch(() => ({}))
    const target = idSchema.safeParse(body.company_id)
    if (!target.success) return NextResponse.json({ error: 'Loja inválida' }, { status: 400 })
    if (target.data === companyId) return NextResponse.json({ success: true })

    const { data: access } = await db.from('store_access').select('role').eq('clerk_id', userId).eq('company_id', target.data).maybeSingle()
    if (!access) return NextResponse.json({ error: 'Você não tem acesso a essa loja' }, { status: 403 })

    const { error: keepError } = await db.from('store_access').upsert({ clerk_id: userId, company_id: companyId, role }, { onConflict: 'clerk_id,company_id' })
    if (keepError) return NextResponse.json({ error: keepError.message }, { status: 500 })

    const { error } = await db.from('users').update({ company_id: target.data, role: access.role }).eq('id', dbUser.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
