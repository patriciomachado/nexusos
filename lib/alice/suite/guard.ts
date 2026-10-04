import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AliceSettings } from '../config'

/** Random pause before answering, so replies don't land instantly like a script (WA-AKG's anti-ban delay). */
export async function humanDelay(s: Pick<AliceSettings, 'reply_delay_min_ms' | 'reply_delay_max_ms'>) {
    const min = Math.max(0, s.reply_delay_min_ms)
    const max = Math.max(min, s.reply_delay_max_ms)
    if (!max) return
    await new Promise(r => setTimeout(r, min + Math.random() * (max - min)))
}

/**
 * Anti-spam: more than `antispam_limit` customer messages inside the window and the chat
 * stops getting automatic answers (a person can still reply). Counts the stored inbound rows.
 * Returns 'first' on the message that crosses the limit, so the caller can leave one note.
 */
export async function floodState(db: SupabaseClient, s: AliceSettings, conversationId: string): Promise<'ok' | 'first' | 'flooding'> {
    if (!s.antispam_enabled) return 'ok'
    const since = new Date(Date.now() - s.antispam_window_seconds * 1000).toISOString()
    const { count } = await db
        .from('alice_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .gte('created_at', since)
    const n = count ?? 0
    if (n <= s.antispam_limit) return 'ok'
    return n === s.antispam_limit + 1 ? 'first' : 'flooding'
}
