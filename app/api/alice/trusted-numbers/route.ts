import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'
import { digitsOnly } from '@/lib/alice/phone'

/** Each admin/owner/manager registers their own WhatsApp; Alice then talks to them as staff, not a customer. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { data } = await ctx.db.from('alice_trusted_numbers').select('phone').eq('company_id', ctx.companyId).eq('user_id', ctx.dbUser.id).maybeSingle()
    return NextResponse.json({ phone: data?.phone ?? null })
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({})) as { phone?: string }
    const phone = digitsOnly(body.phone)
    if (phone.length < 10) return NextResponse.json({ error: 'Informe um número de WhatsApp válido, com DDD.' }, { status: 400 })

    const { error } = await ctx.db
        .from('alice_trusted_numbers')
        .upsert({ company_id: ctx.companyId, user_id: ctx.dbUser.id, phone }, { onConflict: 'company_id,user_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ phone })
}

export async function DELETE() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role)) return forbiddenResponse()
    const { error } = await ctx.db.from('alice_trusted_numbers').delete().eq('company_id', ctx.companyId).eq('user_id', ctx.dbUser.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
