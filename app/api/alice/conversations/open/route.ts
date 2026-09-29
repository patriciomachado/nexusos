import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { channelReady } from '@/lib/alice/channel'
import { findOrCreateWhatsAppConversation } from '@/lib/alice/conversations'
import { waFullNumber } from '@/lib/alice/phone'

const schema = z.object({
    phone: z.string().trim().min(1),
    customer_id: z.string().uuid().nullable().optional(),
    name: z.string().trim().max(200).nullable().optional(),
})

/** Whether a message to this number can go through the app's WhatsApp chat instead of opening wa.me. */
export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 })

    const phone = waFullNumber(parsed.data.phone)
    if (!phone || !settings.whatsapp_enabled || !channelReady(settings)) {
        return NextResponse.json({ available: false })
    }

    const conv = await findOrCreateWhatsAppConversation(ctx.db, ctx.companyId, phone, parsed.data.name ?? null, parsed.data.customer_id ?? null)
    return NextResponse.json({ available: true, id: conv.id })
}
