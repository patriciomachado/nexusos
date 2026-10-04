import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AliceSettings } from '../config'
import type { InboundMessage } from '../gateway'
import { channelSend } from '../channel'
import { saveMessage } from '../agent'
import { sendSticker } from './media'

const HELP = (p: string) => `Comandos disponíveis:\n${p}ping — testa se estou no ar\n${p}figurinha — envie uma foto com essa legenda e eu devolvo como figurinha\n${p}ajuda — esta lista`

/**
 * WA-AKG-style bot commands (prefix + word). Returns true when the message was a command that
 * was handled, so Alice (the AI) doesn't also answer it. Unknown words fall through to Alice.
 * Opt-in per store, and by default only for the registered staff numbers.
 */
export async function handleCommand(
    db: SupabaseClient,
    s: AliceSettings,
    msg: InboundMessage,
    conv: { id: string },
    trusted: boolean,
): Promise<boolean> {
    if (!s.bot_commands_enabled) return false
    const text = msg.text?.trim() ?? ''
    if (!text.startsWith(s.bot_prefix)) return false
    const word = text.slice(s.bot_prefix.length).split(/\s+/)[0]?.toLowerCase()
    if (!word) return false
    const known = ['ping', 'ajuda', 'help', 'figurinha', 'sticker', 's']
    if (!known.includes(word)) return false
    if (s.bot_commands_mode === 'trusted' && !trusted) return false

    const reply = async (body: string) => {
        await channelSend(s, msg.from, body)
        await saveMessage(db, { conversationId: conv.id, companyId: s.company_id, role: 'assistant', content: [{ type: 'text', text: body }], text: body })
    }

    try {
        if (word === 'ping') {
            const ms = Math.max(0, Date.now() - (msg.timestamp || Date.now()))
            await reply(`pong 🏓 (${ms} ms)`)
        } else if (word === 'ajuda' || word === 'help') {
            await reply(HELP(s.bot_prefix))
        } else if (msg.mediaBase64) {
            await sendSticker(s, msg.from, msg.mediaBase64)
            await saveMessage(db, { conversationId: conv.id, companyId: s.company_id, role: 'assistant', content: [{ type: 'text', text: '[figurinha enviada]' }], text: '🖼️ Figurinha enviada' })
        } else {
            await reply(`Envie uma foto com a legenda ${s.bot_prefix}figurinha.`)
        }
    } catch (err) {
        console.error('[alice] bot command failed:', err)
        await saveMessage(db, { conversationId: conv.id, companyId: s.company_id, role: 'event', text: `Falha no comando ${s.bot_prefix}${word}: ${(err as Error).message}` }).catch(() => {})
    }
    return true
}
