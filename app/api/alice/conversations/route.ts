import { NextRequest, NextResponse } from 'next/server'
import { requireAliceUser } from '@/lib/alice/access'
import { isAdminRole } from '@/lib/alice/config'
import { formatWhatsApp, samePhone } from '@/lib/alice/phone'

/**
 * ?channel=app       the caller's own conversations with Alice
 * ?channel=whatsapp  customer chats (admins always; other roles per Alice → Configurações → "Quem pode usar").
 *                    A trusted number's own chat with Alice (financial/supplier tools) stays admin-only.
 */
export async function GET(req: NextRequest) {
    const channel = req.nextUrl.searchParams.get('channel') === 'whatsapp' ? 'whatsapp' : 'app'
    const access = await requireAliceUser()
    if (access.response) return access.response
    const { ctx } = access

    let q = ctx.db
        .from('alice_conversations')
        .select('id, channel, title, customer_name, customer_phone, customer_id, mode, unread_count, last_message_at, last_customer_message_at')
        .eq('company_id', ctx.companyId)
        .eq('channel', channel)
        .order('last_message_at', { ascending: false })
        .limit(channel === 'whatsapp' ? 100 : 30)
    if (channel === 'app') q = q.eq('user_id', ctx.dbUser.id)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: 'Não foi possível carregar as conversas.' }, { status: 500 })

    let rows = data ?? []
    if (channel === 'whatsapp' && !isAdminRole(ctx.role)) {
        const { data: trusted } = await ctx.db.from('alice_trusted_numbers').select('phone').eq('company_id', ctx.companyId)
        const trustedPhones = (trusted ?? []).map(t => t.phone)
        rows = rows.filter(c => !trustedPhones.some(tp => samePhone(tp, c.customer_phone)))
    }

    // Last line of each chat for the list.
    const ids = rows.map(c => c.id)
    const previews = new Map<string, { text: string; role: string }>()
    if (ids.length) {
        const { data: msgs } = await ctx.db
            .from('alice_messages')
            .select('conversation_id, text, role, created_at')
            .in('conversation_id', ids)
            .in('role', ['user', 'assistant', 'staff'])
            .not('text', 'is', null)
            .order('created_at', { ascending: false })
            .limit(400)
        for (const m of msgs ?? []) if (!previews.has(m.conversation_id)) previews.set(m.conversation_id, { text: m.text, role: m.role })
    }

    return NextResponse.json({
        conversations: rows.map(c => ({
            ...c,
            phone_label: c.customer_phone ? formatWhatsApp(c.customer_phone) : null,
            preview: previews.get(c.id) ?? null,
            window_open: c.last_customer_message_at ? Date.now() - new Date(c.last_customer_message_at).getTime() < 24 * 3600 * 1000 : false,
        })),
    })
}
