import 'server-only'

/**
 * Speech-to-text for voice commands and WhatsApp audio. Claude reads text, so
 * audio goes through a transcription service first. Any OpenAI-compatible
 * endpoint works (OpenAI, Groq...):
 *   TRANSCRIBE_API_KEY (or OPENAI_API_KEY)
 *   TRANSCRIBE_API_URL  default https://api.openai.com/v1/audio/transcriptions
 *   TRANSCRIBE_MODEL    default whisper-1
 */
function config() {
    const key = (process.env.TRANSCRIBE_API_KEY || process.env.OPENAI_API_KEY || '').trim()
    const url = (process.env.TRANSCRIBE_API_URL || 'https://api.openai.com/v1/audio/transcriptions').trim()
    const model = (process.env.TRANSCRIBE_MODEL || 'whisper-1').trim()
    return { key, url, model }
}

export function transcriptionConfigured() {
    return !!config().key
}

export const MAX_AUDIO_BYTES = 4 * 1024 * 1024

export async function transcribe(audio: Blob, filename: string): Promise<string> {
    const { key, url, model } = config()
    if (!key) throw new Error('Transcrição não configurada')
    if (audio.size > MAX_AUDIO_BYTES) throw new Error('Áudio muito longo')
    const form = new FormData()
    form.append('file', audio, filename)
    form.append('model', model)
    form.append('language', 'pt')
    form.append('response_format', 'json')
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
    if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[alice] transcription failed:', res.status, detail.slice(0, 300))
        throw new Error(res.status === 401 ? 'Chave de transcrição inválida' : 'Falha na transcrição')
    }
    const data = await res.json() as { text?: string }
    return (data.text ?? '').trim()
}

/** File name with an extension the transcription API recognizes. */
export function audioFilename(mime: string) {
    const type = mime.split(';')[0].trim()
    const ext: Record<string, string> = {
        'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'm4a',
        'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'video/mp4': 'mp4',
    }
    return `audio.${ext[type] ?? 'webm'}`
}
