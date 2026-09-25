import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { appUrl, type AliceSettings } from '@/lib/alice/config'
import { gatewayConnect, gatewayLogout, gatewayStatus, newWebhookSecret, type GatewayState } from '@/lib/alice/gateway'
import { isGateway } from '@/lib/alice/channel'
import { WhatsAppError } from '@/lib/alice/whatsapp'
import { formatWhatsApp } from '@/lib/alice/phone'

export const maxDuration = 60

type Ctx = NonNullable<Awaited<ReturnType<typeof requireAliceAdmin>>['ctx']>

function fail(err: unknown) {
    const message = err instanceof WhatsAppError ? err.message : 'Não foi possível falar com o WhatsApp. Tente de novo.'
    if (!(err instanceof WhatsAppError)) console.error('[whatsapp-qr]', err)
    return NextResponse.json({ error: message }, { status: 502 })
}

/** Keeps the number shown on the Alice page in sync with the connection. */
async function remember(ctx: Ctx, settings: AliceSettings, st: GatewayState) {
    if (st.state !== 'connected') return
    const display = st.phone ? formatWhatsApp(st.phone) : null
    if (display === settings.whatsapp_display_phone && (st.name ?? null) === settings.whatsapp_verified_name) return
    await ctx.db.from('alice_settings').update({ whatsapp_display_phone: display, whatsapp_verified_name: st.name ?? null }).eq('company_id', ctx.companyId)
}

/** Connection state of the number connected by QR code; ?qr=1 also returns a fresh QR code. */
export async function GET(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    if (!isGateway(settings) || !settings.whatsapp_webhook_secret) return NextResponse.json({ state: 'disconnected' })
    try {
        const st = await gatewayStatus(settings, req.nextUrl.searchParams.get('qr') === '1')
        await remember(ctx, settings, st)
        return NextResponse.json(st)
    } catch (err) {
        return fail(err)
    }
}

const bodySchema = z.object({ action: z.enum(['connect', 'disconnect']) })

export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
    if (!isGateway(settings)) return NextResponse.json({ error: 'Escolha a conexão por QR Code primeiro.' }, { status: 400 })

    if (parsed.data.action === 'disconnect') {
        await gatewayLogout(settings)
        await ctx.db.from('alice_settings').update({ whatsapp_enabled: false, whatsapp_display_phone: null, whatsapp_verified_name: null }).eq('company_id', ctx.companyId)
        return NextResponse.json({ state: 'disconnected' })
    }

    // The secret in the webhook URL identifies this store to our server.
    let secret = settings.whatsapp_webhook_secret
    if (!secret) {
        secret = newWebhookSecret()
        const { error } = await ctx.db.from('alice_settings').upsert({ company_id: ctx.companyId, whatsapp_webhook_secret: secret }, { onConflict: 'company_id' })
        if (error) return NextResponse.json({ error: 'Não foi possível preparar a conexão.' }, { status: 500 })
    }
    try {
        const st = await gatewayConnect({ ...settings, whatsapp_webhook_secret: secret }, `${appUrl()}/api/whatsapp/gateway/${secret}`)
        await remember(ctx, settings, st)
        return NextResponse.json(st)
    } catch (err) {
        return fail(err)
    }
}
