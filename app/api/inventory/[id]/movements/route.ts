import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { idSchema } from '@/lib/validations/schemas'

/** Stock history of one product, newest first. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { data, error } = await ctx.db
        .from('inventory_movements')
        .select('id, quantity, balance, kind, reason, unit_cost, created_at, users(full_name)')
        .eq('company_id', ctx.companyId)
        .eq('item_id', id)
        .order('created_at', { ascending: false })
        .limit(100)
    // Without the 20261002 database update there's simply no history yet.
    if (error) return NextResponse.json({ data: [], ready: error.code !== '42P01' && error.code !== 'PGRST205' })
    return NextResponse.json({ data, ready: true })
}
