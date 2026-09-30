'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 60

type Recognition = {
    lang: string
    interimResults: boolean
    continuous: boolean
    start(): void
    stop(): void
    abort(): void
    onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
    onerror: ((e: { error: string }) => void) | null
    onend: (() => void) | null
}

function recognitionCtor(): (new () => Recognition) | null {
    if (typeof window === 'undefined') return null
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function pickMime() {
    if (typeof MediaRecorder === 'undefined') return null
    for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
        if (MediaRecorder.isTypeSupported?.(t)) return t
    }
    return ''
}

export type VoiceState = 'idle' | 'recording' | 'transcribing'

/**
 * Push-to-talk. Uses the server transcription (records audio and uploads it)
 * when configured, otherwise the browser's own speech recognition.
 */
export function useVoice({ serverTranscription, onText, onError }: { serverTranscription: boolean; onText: (text: string) => void; onError: (message: string) => void }) {
    const [state, setState] = useState<VoiceState>('idle')
    const [elapsed, setElapsed] = useState(0)
    const [level, setLevel] = useState(0)
    const [interim, setInterim] = useState('')
    const recorder = useRef<MediaRecorder | null>(null)
    const recognition = useRef<Recognition | null>(null)
    const stream = useRef<MediaStream | null>(null)
    const timers = useRef<{ tick?: ReturnType<typeof setInterval>; raf?: number }>({})
    const audioCtx = useRef<AudioContext | null>(null)

    const mode: 'server' | 'browser' | null =
        serverTranscription && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && pickMime() !== null ? 'server'
            : recognitionCtor() ? 'browser' : null

    const cleanup = useCallback(() => {
        clearInterval(timers.current.tick)
        if (timers.current.raf) cancelAnimationFrame(timers.current.raf)
        stream.current?.getTracks().forEach(t => t.stop())
        stream.current = null
        audioCtx.current?.close().catch(() => {})
        audioCtx.current = null
        setLevel(0)
    }, [])

    useEffect(() => () => {
        if (recorder.current?.state === 'recording') recorder.current.stop()
        recognition.current?.abort()
        cleanup()
    }, [cleanup])

    const stop = useCallback(() => {
        if (recorder.current?.state === 'recording') recorder.current.stop()
        recognition.current?.stop()
    }, [])

    const start = useCallback(async () => {
        if (state !== 'idle' || !mode) return
        setElapsed(0)
        setInterim('')

        if (mode === 'browser') {
            const Ctor = recognitionCtor()!
            const rec = new Ctor()
            rec.lang = 'pt-BR'
            rec.interimResults = true
            rec.continuous = false
            let finalText = ''
            rec.onresult = e => {
                let text = ''
                for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
                setInterim(text)
                finalText = text
            }
            rec.onerror = e => {
                if (e.error === 'not-allowed' || e.error === 'service-not-allowed') onError('Permita o uso do microfone para falar com a Alice.')
                else if (e.error !== 'no-speech' && e.error !== 'aborted') onError('Não consegui ouvir. Tente de novo.')
            }
            rec.onend = () => {
                clearInterval(timers.current.tick)
                setState('idle')
                setInterim('')
                recognition.current = null
                if (finalText.trim()) onText(finalText.trim())
            }
            recognition.current = rec
            rec.start()
            setState('recording')
            timers.current.tick = setInterval(() => setElapsed(s => s + 1), 1000)
            return
        }

        try {
            const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
            stream.current = media
            const mime = pickMime() || undefined
            const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined)
            const chunks: Blob[] = []
            rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
            rec.onstop = async () => {
                cleanup()
                const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })
                if (blob.size < 1200) { setState('idle'); return } // tap without speaking
                setState('transcribing')
                try {
                    const form = new FormData()
                    form.append('audio', blob, 'voz')
                    const res = await fetch('/api/alice/transcribe', { method: 'POST', body: form })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error(data.error || 'Não consegui entender o áudio.')
                    if (data.text?.trim()) onText(data.text.trim())
                    else onError('Não ouvi nada. Tente falar mais perto do microfone.')
                } catch (err) {
                    onError((err as Error).message)
                } finally {
                    setState('idle')
                }
            }
            recorder.current = rec
            rec.start()
            setState('recording')

            // Input level for the live indicator.
            try {
                const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
                const ctx = new AC()
                audioCtx.current = ctx
                const analyser = ctx.createAnalyser()
                analyser.fftSize = 256
                ctx.createMediaStreamSource(media).connect(analyser)
                const buf = new Uint8Array(analyser.frequencyBinCount)
                const loop = () => {
                    analyser.getByteTimeDomainData(buf)
                    let peak = 0
                    for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
                    setLevel(Math.min(1, peak / 64))
                    timers.current.raf = requestAnimationFrame(loop)
                }
                loop()
            } catch { /* level meter is optional */ }

            timers.current.tick = setInterval(() => {
                setElapsed(s => {
                    if (s + 1 >= MAX_SECONDS) stop()
                    return s + 1
                })
            }, 1000)
        } catch (err) {
            cleanup()
            setState('idle')
            const name = (err as { name?: string }).name
            onError(name === 'NotAllowedError' ? 'Permita o uso do microfone para falar com a Alice.' : 'Não foi possível usar o microfone.')
        }
    }, [state, mode, onText, onError, cleanup, stop])

    return { supported: !!mode, state, elapsed, level, interim, start, stop }
}

/** Reads Alice's answer aloud (Portuguese voice when the device has one). */
export function speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const clean = text
        .replace(/\*\*?|__|`|#+\s/g, '')
        .replace(/https?:\/\/\S+/g, 'link na tela')
        .replace(/R\$\s?/g, 'R$ ')
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'pt-BR'
    u.rate = 1.05
    const voice = window.speechSynthesis.getVoices().find(v => v.lang?.toLowerCase().startsWith('pt-br')) ?? window.speechSynthesis.getVoices().find(v => v.lang?.toLowerCase().startsWith('pt'))
    if (voice) u.voice = voice
    window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}
