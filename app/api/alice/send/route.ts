import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { channelReady } from '@/lib/alice/channel'
import { saveMessage } from '@/lib/alice/agent'
import { findOrCreateWhatsAppConversation } from '@/lib/alice/conversations'
import { bad, firstIssue, mediaFields, ownMediaUrl } from '@/lib/alice/suite/api'
import { sendRich } from '@/lib/alice/suite/media'
import { dispatchEvent } from '@/lib/alice/suite/webhooks'
import { waPhone } from '@/lib/customers/messages'

const schema = z.object({
    to: z.string().trim().min(1, 'Informe o destinatário.'),
    text: z.string().trim().max(4000).nullable().optional(),
    ...mediaFields,
})

/** Manual message to a contact or group from the Contatos / Grupos screens. Contacts also land in the inbox history. */
export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return bad(firstIssue(parsed.error))
    const m = parsed.data
    if (!m.text && !m.media_url) return bad('Escreva a mensagem ou anexe um arquivo.')
    if (!settings.whatsapp_enabled || !channelReady(settings)) return bad('O WhatsApp não está conectado.')
    if (m.media_url && (!m.media_type || !ownMediaUrl(m.media_url, ctx.companyId))) return bad('Arquivo inválido. Envie o anexo pela tela.')

    const isGroup = m.to.endsWith('@g.us')
    if (isGroup) {
        const { data: group } = await ctx.db.from('alice_wa_groups').select('jid').eq('company_id', ctx.companyId).eq('jid', m.to).maybeSingle()
        if (!group) return bad('Grupo não encontrado. Atualize a lista de grupos.', 404)
    }
    const phone = isGroup ? null : waPhone(m.to)
    if (!isGroup && !phone) return bad('Número inválido.')

    try {
        await sendRich(settings, isGroup ? m.to : phone!, { text: m.text, media: m.media_url && m.media_type ? { url: m.media_url, type: m.media_type as 'image', name: m.media_name } : null })
    } catch (err) {
        return bad(err instanceof Error ? err.message : 'Não foi possível enviar.', 502)
    }
    if (phone) {
        const conv = await findOrCreateWhatsAppConversation(ctx.db, ctx.companyId, phone, null, null)
        const shown = m.text || `[${m.media_type}]`
        await saveMessage(ctx.db, { conversationId: conv.id, companyId: ctx.companyId, role: 'staff', text: shown, content: [], authorUserId: ctx.dbUser.id })
    }
    void dispatchEvent(ctx.db, ctx.companyId, 'message.sent', { to: m.to, text: m.text ?? null, source: 'staff' })
    return NextResponse.json({ ok: true })
}
