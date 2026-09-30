import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAliceAdmin } from '@/lib/alice/access'
import { numberStatus, registerNumber, WhatsAppError } from '@/lib/alice/whatsapp'

function describe(err: unknown) {
    if (err instanceof WhatsAppError) {
        return { error: err.message, code: err.code ?? null, details: err.details ?? null }
    }
    return { error: 'Não foi possível falar com a Meta agora.', code: null, details: null }
}

function needCredentials() {
    return NextResponse.json({ error: 'Salve primeiro a identificação do número e o token (Salvar e verificar).' }, { status: 400 })
}

/** Current state of the saved number at Meta (verified, name approved, registered). */
export async function GET() {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { settings } = access
    if (!settings.whatsapp_phone_number_id || !settings.whatsapp_access_token) return needCredentials()
    try {
        return NextResponse.json({ status: await numberStatus(settings.whatsapp_access_token, settings.whatsapp_phone_number_id) })
    } catch (err) {
        return NextResponse.json(describe(err), { status: 502 })
    }
}

const bodySchema = z.object({ pin: z.string().regex(/^\d{6}$/, 'O PIN tem 6 dígitos.') })

/** Registers the saved number on the Cloud API with a 6-digit PIN. */
export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { settings } = access
    if (!settings.whatsapp_phone_number_id || !settings.whatsapp_access_token) return needCredentials()
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'PIN inválido.' }, { status: 400 })
    try {
        await registerNumber(settings.whatsapp_access_token, settings.whatsapp_phone_number_id, parsed.data.pin)
        const status = await numberStatus(settings.whatsapp_access_token, settings.whatsapp_phone_number_id).catch(() => null)
        return NextResponse.json({ ok: true, status })
    } catch (err) {
        return NextResponse.json(describe(err), { status: 422 })
    }
}
