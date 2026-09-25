import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { aliceConfigured, aliceModel, loadSettings, monthlyUsage, publicSettings, STAFF_ROLES } from '@/lib/alice/config'
import { planRequiredResponse } from '@/lib/plan-server'
import { qrServerConfigured } from '@/lib/alice/gateway'
import { transcriptionConfigured } from '@/lib/alice/transcribe'
import { webhookConfigured, describeNumber, WhatsAppError } from '@/lib/alice/whatsapp'
import { appUrl } from '@/lib/alice/config'

export async function GET() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    return NextResponse.json({
        settings: publicSettings(settings),
        usage: await monthlyUsage(ctx.db, ctx.companyId),
        environment: {
            ai: aliceConfigured(),
            model: aliceModel('app'),
            whatsappModel: aliceModel('whatsapp'),
            transcription: transcriptionConfigured(),
            whatsappWebhook: webhookConfigured(),
            webhookUrl: `${appUrl()}/api/whatsapp/webhook`,
            qrServer: qrServerConfigured(),
        },
    })
}

const putSchema = z.object({
    enabled: z.boolean().optional(),
    staff_roles: z.array(z.enum(STAFF_ROLES)).optional(),
    store_info: z.string().max(4000).nullable().optional(),
    monthly_limit: z.number().int().min(0).max(1_000_000).optional(),
    whatsapp_enabled: z.boolean().optional(),
    whatsapp_phone_number_id: z.string().trim().regex(/^\d{6,30}$/, 'Identificação do número inválida (só dígitos)').nullable().optional(),
    // Write-only: omitted keeps the saved token, null removes it.
    whatsapp_access_token: z.string().trim().min(20).max(1000).nullable().optional(),
    // QR code connection (own server / Evolution API / Z-API). Tokens are write-only too.
    whatsapp_provider: z.enum(['cloud', 'evolution', 'zapi']).optional(),
    whatsapp_gateway_url: z.string().trim().url('Endereço do servidor inválido').max(300).nullable().optional().or(z.literal('').transform(() => null)),
    whatsapp_gateway_instance: z.string().trim().regex(/^[\w.-]{1,120}$/, 'Nome/ID da instância inválido').nullable().optional().or(z.literal('').transform(() => null)),
    whatsapp_gateway_token: z.string().trim().min(4).max(500).nullable().optional(),
    whatsapp_gateway_client_token: z.string().trim().min(4).max(500).nullable().optional(),
})

export async function PUT(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx, settings } = access
    const parsed = putSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 })
    const next = { ...parsed.data }
    if (settings.plan_blocked && (next.enabled || next.whatsapp_enabled)) return planRequiredResponse('alice')
    if (next.monthly_limit != null && settings.plan_limit != null) next.monthly_limit = Math.min(next.monthly_limit, settings.plan_limit)

    const phoneId = next.whatsapp_phone_number_id !== undefined ? next.whatsapp_phone_number_id : settings.whatsapp_phone_number_id
    const token = next.whatsapp_access_token !== undefined ? next.whatsapp_access_token : settings.whatsapp_access_token
    let numberInfo: { whatsapp_display_phone?: string | null; whatsapp_verified_name?: string | null } = {}

    // Credentials changed: check them with Meta before saving.
    if ((next.whatsapp_phone_number_id !== undefined || next.whatsapp_access_token !== undefined) && phoneId && token) {
        try {
            const info = await describeNumber(token, phoneId)
            numberInfo = { whatsapp_display_phone: info.display_phone_number ?? null, whatsapp_verified_name: info.verified_name ?? null }
        } catch (err) {
            const message = err instanceof WhatsAppError ? err.message : 'Não foi possível validar com a Meta.'
            return NextResponse.json({ error: `A Meta recusou as credenciais: ${message}` }, { status: 400 })
        }
    }
    const provider = next.whatsapp_provider ?? settings.whatsapp_provider
    // Switching the way of connecting pauses the WhatsApp until the new one is ready.
    const switching = next.whatsapp_provider !== undefined && next.whatsapp_provider !== settings.whatsapp_provider
    if (switching) Object.assign(next, { whatsapp_enabled: false })
    if (next.whatsapp_enabled && provider === 'cloud' && !(phoneId && token)) {
        return NextResponse.json({ error: 'Informe a identificação do número e o token antes de ativar o WhatsApp.' }, { status: 400 })
    }
    if (next.whatsapp_enabled && provider !== 'cloud' && !settings.whatsapp_webhook_secret) {
        return NextResponse.json({ error: 'Conecte o número pelo QR Code antes de ativar.' }, { status: 400 })
    }

    const { error } = await ctx.db.from('alice_settings').upsert({
        company_id: ctx.companyId,
        ...next,
        ...numberInfo,
        ...(provider === 'cloud' && !phoneId ? { whatsapp_display_phone: null, whatsapp_verified_name: null, whatsapp_enabled: false } : {}),
        ...(switching ? { whatsapp_display_phone: null, whatsapp_verified_name: null } : {}),
        updated_by: ctx.dbUser.id,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Este número de WhatsApp já está ligado a outra loja.' }, { status: 409 })
        console.error('[alice] settings save failed:', error)
        return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 })
    }
    return NextResponse.json({ settings: publicSettings(await loadSettings(ctx.db, ctx.companyId)) })
}
