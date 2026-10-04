import 'server-only'
import type { AliceSettings } from '../config'
import { channelSend, isGateway } from '../channel'
import { gatewaySendMedia, gatewaySendSticker, type OutboundMediaType } from '../gateway'
import { WhatsAppError } from '../whatsapp'
import { digitsOnly } from '../phone'

export const MEDIA_TYPES: OutboundMediaType[] = ['image', 'video', 'document', 'audio']

export interface Attachment { url: string; type: OutboundMediaType; name?: string | null }

/** Where a message goes: a phone number (with country code) or a group id (…@g.us). */
export function targetOf(value: string) {
    return value.includes('@') ? value : digitsOnly(value)
}

/**
 * Text and/or attachment to a number or group, over whichever QR connection the store uses.
 * With an attachment, the text becomes its caption (documents and audio can't carry one on every
 * client, so they go as a separate text first).
 */
export async function sendRich(s: AliceSettings, to: string, content: { text?: string | null; media?: Attachment | null }) {
    const text = content.text?.trim() || null
    const media = content.media
    if (!media) {
        if (!text) throw new WhatsAppError('Nada para enviar.')
        return channelSend(s, to, text)
    }
    if (!isGateway(s)) throw new WhatsAppError('Enviar imagem, vídeo ou documento exige a conexão por QR Code.')
    const captionless = media.type === 'audio'
    if (text && captionless) await channelSend(s, to, text)
    await gatewaySendMedia(s, to, { type: media.type, url: media.url, caption: captionless ? null : text, fileName: media.name })
}

export async function sendSticker(s: AliceSettings, to: string, image: string) {
    if (!isGateway(s)) throw new WhatsAppError('Figurinhas exigem a conexão por QR Code.')
    await gatewaySendSticker(s, to, image)
}
