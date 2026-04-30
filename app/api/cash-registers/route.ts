import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

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

    const { data, error, count } = await query.limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If status=open is requested, return just the object if it exists
    if (status === 'open' && data && data.length > 0) {
        return NextResponse.json(data[0])
    }

    return NextResponse.json({ data, count })
}
