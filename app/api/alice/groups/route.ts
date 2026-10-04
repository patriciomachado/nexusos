import { NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { isGateway } from '@/lib/alice/channel'
import { gatewayGroups } from '@/lib/alice/gateway'
import { bad } from '@/lib/alice/suite/api'
import { WhatsAppError } from '@/lib/alice/whatsapp'

export async function GET() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const { data, error } = await ctx.db.from('alice_wa_groups').select('id, jid, subject, description, participants, synced_at').eq('company_id', ctx.companyId).order('subject')
    if (error) return bad('Não foi possível carregar. Rodou a migration 20261010_alice_whatsapp_suite.sql?', 500)
    return NextResponse.json({ groups: data ?? [] })
}

/** Reads the groups the connected number is in. */
export async function POST() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    if (!isGateway(settings) || !settings.whatsapp_webhook_secret) return bad('Conecte o WhatsApp por QR Code primeiro.')
    try {
        const groups = await gatewayGroups(settings)
        const now = new Date().toISOString()
        if (groups.length) {
            const { error } = await ctx.db.from('alice_wa_groups').upsert(groups.map(g => ({ company_id: ctx.companyId, jid: g.id, subject: g.subject || 'Grupo sem nome', description: g.desc, participants: g.size, synced_at: now })), { onConflict: 'company_id,jid' })
            if (error) throw error
        }
        // Groups the number left no longer show up.
        await ctx.db.from('alice_wa_groups').delete().eq('company_id', ctx.companyId).lt('synced_at', now)
        return NextResponse.json({ synced: groups.length })
    } catch (err) {
        console.error('[alice] group sync failed:', err)
        return bad(err instanceof WhatsAppError ? err.message : 'Não foi possível ler os grupos.', 502)
    }
}
