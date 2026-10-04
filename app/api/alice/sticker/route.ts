import { NextRequest, NextResponse } from 'next/server'
import { requireAliceAdmin } from '@/lib/alice/access'
import { channelReady } from '@/lib/alice/channel'
import { bad } from '@/lib/alice/suite/api'
import { sendSticker } from '@/lib/alice/suite/media'
import { waPhone } from '@/lib/customers/messages'

/** Turns a picture into a sticker and sends it to a number or group. */
export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { settings } = access
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    const to = String(form?.get('to') ?? '').trim()
    if (!(file instanceof File) || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return bad('Escolha uma imagem (JPG, PNG, WebP ou GIF).')
    if (file.size > 5 * 1024 * 1024) return bad('A imagem passa de 5 MB.')
    const target = to.endsWith('@g.us') ? to : waPhone(to)
    if (!target) return bad('Número inválido.')
    if (!settings.whatsapp_enabled || !channelReady(settings)) return bad('O WhatsApp não está conectado.')
    try {
        await sendSticker(settings, target, `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`)
    } catch (err) {
        return bad(err instanceof Error ? err.message : 'Não foi possível enviar a figurinha.', 502)
    }
    return NextResponse.json({ ok: true })
}
