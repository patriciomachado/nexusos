import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { isGateway } from '@/lib/alice/channel'
import { bad } from '@/lib/alice/suite/api'
import { syncContacts } from '@/lib/alice/suite/contacts'
import { WhatsAppError } from '@/lib/alice/whatsapp'

export async function GET(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const q = req.nextUrl.searchParams.get('q')?.trim().replace(/[%,()]/g, '') ?? ''
    let query = ctx.db.from('alice_wa_contacts').select('id, phone, name, push_name, customer_id, blocked, last_seen_at', { count: 'exact' }).eq('company_id', ctx.companyId).order('last_seen_at', { ascending: false, nullsFirst: false }).limit(300)
    if (q) query = query.or(`name.ilike.%${q}%,push_name.ilike.%${q}%,phone.ilike.%${q}%`)
    const { data, count, error } = await query
    if (error) return bad('Não foi possível carregar. Rodou a migration 20261010_alice_whatsapp_suite.sql?', 500)
    const ids = [...new Set((data ?? []).map(c => c.customer_id).filter(Boolean))]
    const names = new Map<string, string>()
    if (ids.length) for (const c of (await ctx.db.from('customers').select('id, name').in('id', ids)).data ?? []) names.set(c.id, c.name)
    return NextResponse.json({ total: count ?? 0, contacts: (data ?? []).map(c => ({ ...c, customer_name: c.customer_id ? names.get(c.customer_id) ?? null : null })) })
}

/** Pulls the WhatsApp address book from the connected number. */
export async function POST() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    if (!isGateway(settings) || !settings.whatsapp_webhook_secret) return bad('Conecte o WhatsApp por QR Code primeiro.')
    try {
        return NextResponse.json({ synced: await syncContacts(ctx.db, settings) })
    } catch (err) {
        console.error('[alice] contact sync failed:', err)
        return bad(err instanceof WhatsAppError ? err.message : 'Não foi possível sincronizar os contatos.', 502)
    }
}
