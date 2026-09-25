import 'server-only'
import type { AliceSettings } from './config'
import { downloadMedia, markReadAndTyping, sendText, splitMessage } from './whatsapp'
import { gatewayDownload, gatewayMarkRead, gatewaySend, type InboundMessage, type Media } from './gateway'

/**
 * One way to talk to the store's WhatsApp, whichever connection it uses:
 * the Meta Cloud API or its own number by QR code (gateway).
 */

export function isGateway(s: AliceSettings) {
    return s.whatsapp_provider === 'evolution' || s.whatsapp_provider === 'zapi'
}

/** Has what it needs to send (connection details saved). */
export function channelReady(s: AliceSettings) {
    if (isGateway(s)) return !!s.whatsapp_webhook_secret
    return !!s.whatsapp_access_token && !!s.whatsapp_phone_number_id
}

export async function channelSend(s: AliceSettings, to: string, text: string) {
    if (isGateway(s)) return gatewaySend(s, to, text, splitMessage(text))
    if (!s.whatsapp_access_token || !s.whatsapp_phone_number_id) throw new Error('WhatsApp não configurado.')
    await sendText(s.whatsapp_access_token, s.whatsapp_phone_number_id, to, text)
}

export async function channelMarkRead(s: AliceSettings, msg: InboundMessage) {
    if (isGateway(s)) return gatewayMarkRead(s, msg)
    if (s.whatsapp_access_token && s.whatsapp_phone_number_id) await markReadAndTyping(s.whatsapp_access_token, s.whatsapp_phone_number_id, msg.id)
}

export async function channelDownload(s: AliceSettings, media: Media) {
    if (media.kind === 'cloud') {
        if (!s.whatsapp_access_token) throw new Error('WhatsApp não configurado.')
        return downloadMedia(s.whatsapp_access_token, media.id)
    }
    return gatewayDownload(s, media)
}
