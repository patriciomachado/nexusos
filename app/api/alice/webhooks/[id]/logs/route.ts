import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad, uuid } from '@/lib/alice/suite/api'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { id } = await params
    if (!uuid.safeParse(id).success) return bad('Webhook inválido.')
    const { data } = await ctx.db.from('alice_webhook_logs').select('id, event, status_code, ok, error, created_at').eq('webhook_id', id).eq('company_id', ctx.companyId).order('created_at', { ascending: false }).limit(30)
    return NextResponse.json({ logs: data ?? [] })
}
