import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { rateLimit, getClientIp } from '@/lib/security-rate-limit'
import { createFunnelEntry } from '@/lib/funnel/entries'
import { ADMIN_ROLES } from '@/lib/alice/config'
import { pushToCompany } from '@/lib/tasks/reminders'
import { todayInStore } from '@/lib/alice/tools/helpers'

/**
 * Public lead-capture form (no auth): a store shares /lead/[company id] on a
 * QR code, Instagram bio etc. Every submission becomes a "Lead" card in the
 * Funil, and admins get a task + push so nothing sits unseen.
 */
export async function POST(req: NextRequest) {
    const ip = getClientIp(req)
    if (!rateLimit('lead-capture', 5, 600_000, ip)) {
        return NextResponse.json({ error: 'Muitas solicitações. Tente novamente em instantes.' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    // Honeypot: a hidden field real visitors never fill. Pretend success so a bot doesn't retry.
    if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ ok: true })

    const companyId = typeof body.company_id === 'string' ? body.company_id : ''
    const name = String(body.name ?? '').trim().slice(0, 120)
    const phoneDigits = String(body.phone ?? '').replace(/\D/g, '')
    const device = typeof body.device === 'string' ? body.device.trim().slice(0, 150) : ''
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : ''

    if (!companyId) return NextResponse.json({ error: 'Link inválido.' }, { status: 400 })
    if (name.length < 2) return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 })
    if (phoneDigits.length < 10) return NextResponse.json({ error: 'Informe um telefone com DDD.' }, { status: 400 })

    const db = createAdminClient()
    const { data: company } = await db.from('companies').select('id, name').eq('id', companyId).maybeSingle()
    if (!company) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 })

    try {
        await createFunnelEntry(db, {
            companyId,
            title: device ? `Contato pelo site: ${device}` : 'Contato pelo site',
            leadName: name,
            leadPhone: phoneDigits,
            stage: 'lead',
            source: 'landing',
            notes: message || null,
        })
    } catch (err) {
        console.error('[lead] create failed:', err)
        return NextResponse.json({ error: 'Não foi possível enviar agora. Tente de novo.' }, { status: 500 })
    }

    const { data: admins } = await db.from('users').select('id').eq('company_id', companyId).in('role', ADMIN_ROLES).eq('is_active', true)
    if (admins?.length) {
        await db.from('tasks').insert({
            company_id: companyId,
            user_id: admins[0].id,
            title: `Novo lead: ${name}`.slice(0, 300),
            notes: [device && `Aparelho/assunto: ${device}`, message].filter(Boolean).join('\n') || null,
            priority: 2,
            do_date: todayInStore(),
            source_key: `lead:${companyId}:${Date.now()}`,
            source_href: '/funil',
        })
        await db.from('notifications').insert(admins.map(a => ({
            company_id: companyId, user_id: a.id, type: 'push', status: 'pending',
            title: 'Novo lead pelo site', message: `${name} entrou em contato${device ? ` sobre ${device}` : ''}`.slice(0, 500),
            related_entity_type: 'funnel_entry', related_entity_id: null,
        })))
    }
    await pushToCompany(db, companyId, { title: 'Novo lead pelo site', body: `${name} entrou em contato${device ? ` sobre ${device}` : ''}`, url: '/funil', tag: `lead-${companyId}` }).catch(err => console.error('[lead] push failed:', err))

    return NextResponse.json({ ok: true })
}
