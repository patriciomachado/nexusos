import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { hashPin, isOwner, loadCashSettings, normalizeCashSettings, publicCashSettings, saveCashSettings } from '@/lib/cash/server'
import { loadSettings } from '@/lib/alice/config'
import { channelReady } from '@/lib/alice/channel'

/** Cash settings: card fees, withdrawal limit, owner PIN and closing report number. */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { cash } = await loadCashSettings(ctx.db, ctx.companyId)
    const owner = isOwner(ctx.role)
    let whatsappReady = false
    if (owner) {
        try {
            const alice = await loadSettings(ctx.db, ctx.companyId)
            whatsappReady = !alice.plan_blocked && channelReady(alice)
        } catch { /* Alice tables missing */ }
    }
    return NextResponse.json({ ...publicCashSettings(cash, owner), can_edit: owner, whatsapp_ready: whatsappReady })
}

export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isOwner(ctx.role)) return forbiddenResponse()

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const { cash: current } = await loadCashSettings(ctx.db, ctx.companyId)
    const next = normalizeCashSettings({
        ...current,
        fees: body.fees ?? current.fees,
        sangria_limit: body.sangria_limit ?? current.sangria_limit,
        report_phone: 'report_phone' in body ? body.report_phone : current.report_phone,
        pin_hash: current.pin_hash,
    })
    if ('pin' in body) {
        if (body.pin === null || body.pin === '') next.pin_hash = null
        else if (typeof body.pin === 'string' && /^\d{4,6}$/.test(body.pin)) next.pin_hash = hashPin(body.pin)
        else return NextResponse.json({ error: 'A senha deve ter de 4 a 6 números.' }, { status: 400 })
    }
    if (typeof body.report_phone === 'string' && body.report_phone.trim() && !next.report_phone) {
        return NextResponse.json({ error: 'WhatsApp inválido. Use DDD + número.' }, { status: 400 })
    }
    try {
        await saveCashSettings(ctx.db, ctx.companyId, next)
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
    return NextResponse.json(publicCashSettings(next, true))
}
