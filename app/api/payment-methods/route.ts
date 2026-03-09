import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const db = createAdminClient()
    const { data, error } = await db
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
