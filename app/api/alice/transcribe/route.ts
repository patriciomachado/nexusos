import { NextRequest, NextResponse } from 'next/server'
import { requireAliceUser } from '@/lib/alice/access'
import { transcribe, transcriptionConfigured, audioFilename, MAX_AUDIO_BYTES } from '@/lib/alice/transcribe'

export const maxDuration = 60

/** Voice command → text (the text is then sent to /api/alice/chat). */
export async function POST(req: NextRequest) {
    const access = await requireAliceUser()
    if (access.response) return access.response
    if (!transcriptionConfigured()) return NextResponse.json({ error: 'Transcrição de voz não configurada.', code: 'NOT_CONFIGURED' }, { status: 503 })

    const form = await req.formData().catch(() => null)
    const audio = form?.get('audio')
    if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: 'Áudio não recebido.' }, { status: 400 })
    if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: 'Áudio muito longo. Fale por até 1 minuto.' }, { status: 413 })

    try {
        const text = await transcribe(audio, audioFilename(audio.type || 'audio/webm'))
        return NextResponse.json({ text })
    } catch (err) {
        return NextResponse.json({ error: `Não consegui entender o áudio (${(err as Error).message}).` }, { status: 502 })
    }
}
