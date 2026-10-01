import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceUser } from '@/lib/alice/access'
import { channelReady } from '@/lib/alice/channel'
import { waFullNumber } from '@/lib/alice/phone'
import { findOrCreateWhatsAppConversation } from '@/lib/alice/conversations'

const schema = z.object({
    phone: z.string().trim().min(1),
    customerId: z.string().uuid().optional(),
    customerName: z.string().trim().min(1).max(120).optional(),
})

/**
 * Whether a message to this number can go through the app's WhatsApp chat instead of opening wa.me:
 * true whenever the store's WhatsApp is on and connected, even for a customer who never wrote in —
 * WhatsApp's rule (free-form only within 24h of their last message, a template outside it) is enforced
 * by Meta/the gateway at send time, not here, so opening the chat always works; only sending a first
 * message may come back with a clear error if the provider blocks it.
 * Same access as the rest of Alice: admins always, other roles per Alice → Configurações → "Quem pode usar".
 * Deliberately doesn't special-case a trusted number here — doing so would let staff probe arbitrary
 * phone numbers and learn which ones are registered as trusted. The real protection is downstream:
 * opening the returned conversation id still 404s for non-admins if it turns out to be one (see [id]/route.ts).
 */
export async function POST(req: NextRequest) {
    const access = await requireAliceUser()
    if (access.response) return access.response
    const { ctx, settings } = access
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 })

    const phone = waFullNumber(parsed.data.phone)
    if (!phone || !settings.whatsapp_enabled || !channelReady(settings)) {
        return NextResponse.json({ available: false })
    }

    let customerId: string | null = null
    if (parsed.data.customerId) {
        const { data } = await ctx.db.from('customers').select('id').eq('id', parsed.data.customerId).eq('company_id', ctx.companyId).maybeSingle()
        customerId = data?.id ?? null
    }

    const conv = await findOrCreateWhatsAppConversation(ctx.db, ctx.companyId, phone, parsed.data.customerName?.trim() || null, customerId)
    return NextResponse.json({ available: true, id: conv.id })
}
