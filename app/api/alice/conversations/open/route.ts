import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { channelReady } from '@/lib/alice/channel'
import { waFullNumber } from '@/lib/alice/phone'

const schema = z.object({
    phone: z.string().trim().min(1),
})

/**
 * Whether a message to this number can go through the app's WhatsApp chat instead of opening wa.me.
 * Only true for a number that has already written in: WhatsApp's rules don't let the store send a
 * free-form message to someone who never has, template or not, so there's nothing useful to open for
 * a first-ever contact — creating an empty conversation there would just be a dead end.
 */
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

    const { data: conv } = await ctx.db
        .from('alice_conversations')
        .select('id')
        .eq('company_id', ctx.companyId)
        .eq('channel', 'whatsapp')
        .eq('customer_phone', phone)
        .not('last_customer_message_at', 'is', null)
        .maybeSingle()
    if (!conv) return NextResponse.json({ available: false })
    return NextResponse.json({ available: true, id: conv.id })
}
