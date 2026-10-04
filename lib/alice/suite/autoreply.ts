import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AliceSettings } from '../config'
import { samePhone } from '../phone'
import type { Attachment } from './media'

export interface AutoReply {
    id: string
    keyword: string
    match_type: 'exact' | 'contains' | 'regex'
    response: string | null
    media_url: string | null
    media_type: Attachment['type'] | null
    media_name: string | null
    trigger_type: 'all' | 'private' | 'group'
}

const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Regexes typed by the store run on customer text, so they must be bounded: short pattern, short input. */
export function validRegex(pattern: string) {
    if (pattern.length > 120) return false
    // Nested quantifiers like (a+)+ backtrack catastrophically on crafted input: refuse them.
    if (/\([^)]*[+*][^)]*\)\s*[+*{]/.test(pattern)) return false
    try { new RegExp(pattern, 'i'); return true } catch { return false }
}

export function matches(rule: Pick<AutoReply, 'keyword' | 'match_type'>, text: string) {
    const input = text.slice(0, 1000)
    if (rule.match_type === 'regex') {
        if (!validRegex(rule.keyword)) return false
        return new RegExp(rule.keyword, 'i').test(input)
    }
    const a = norm(input)
    const b = norm(rule.keyword)
    if (!b) return false
    return rule.match_type === 'exact' ? a === b : a.includes(b)
}

/** The store's allow/block list for automatic replies (Alice → Respostas automáticas). */
export function autoReplyAllowed(s: Pick<AliceSettings, 'autoreply_mode' | 'autoreply_numbers'>, phone: string) {
    if (s.autoreply_mode === 'all') return true
    const listed = s.autoreply_numbers.some(n => samePhone(n, phone))
    return s.autoreply_mode === 'whitelist' ? listed : !listed
}

/** First enabled rule that matches this text in this kind of chat, or null. */
export async function findAutoReply(db: SupabaseClient, companyId: string, text: string, isGroup: boolean): Promise<AutoReply | null> {
    const { data } = await db
        .from('alice_auto_replies')
        .select('id, keyword, match_type, response, media_url, media_type, media_name, trigger_type')
        .eq('company_id', companyId)
        .eq('enabled', true)
        .in('trigger_type', ['all', isGroup ? 'group' : 'private'])
        .order('created_at', { ascending: true })
        .limit(200)
    return ((data ?? []) as AutoReply[]).find(r => matches(r, text)) ?? null
}

export async function countHit(db: SupabaseClient, rule: AutoReply, current: number) {
    await db.from('alice_auto_replies').update({ hits: current + 1 }).eq('id', rule.id)
}
