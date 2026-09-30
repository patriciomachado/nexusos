import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser, role } = ctx
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const asList = searchParams.get('list') === '1'

    // List cash registers for the company
    let query = db
        .from('cash_registers')
        .select(`
            *,
            users!user_id (full_name)
        `, { count: 'exact' })
        .eq('company_id', companyId)
        .order('opened_at', { ascending: false })

    if (status) {
        query = query.eq('status', status)
    }
    // Operators see only their own registers.
    if (!isManager(role)) query = query.eq('user_id', dbUser.id)

    const { data, error, count } = await query.limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If status=open is requested, return just the object if it exists
    if (status === 'open' && !asList && data && data.length > 0) {
        return NextResponse.json(data[0])
    }

    return NextResponse.json({ data, count })
}
