import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase'
import { dateStringInZone, DEFAULT_TIMEZONE, addDays } from '@/lib/tasks/dates'
import { fill, normalizeAutomations, readyChannel, sendOnce, waPhone } from '@/lib/customers/messages'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(req: NextRequest) {
    const secret = process.env.CRON_SECRET?.trim().replace(/^["']|["']$/g, '')
    if (!secret) return false
    const a = Buffer.from(req.headers.get('authorization') ?? '')
    const b = Buffer.from(`Bearer ${secret}`)
    return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Daily: birthday messages and the Google review request a few days after
 * an OS is delivered, for stores that turned them on (Clientes → Automações).
 * Each message goes once (customer_messages).
 */
export async function GET(req: NextRequest) {
    if (!authorized(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const db = createAdminClient()
    const today = dateStringInZone(DEFAULT_TIMEZONE)
    const md = today.slice(5)
    const { data: companies } = await db.from('companies').select('id, name, settings, google_review_url')
    let sent = 0
    for (const c of companies ?? []) {
        const auto = normalizeAutomations((c.settings as Record<string, unknown> | null)?.automations)
        if (!auto.birthday && !auto.review) continue
        const alice = await readyChannel(db, c.id)
        if (!alice) continue

        if (auto.birthday) {
            const { data: people } = await db.from('customers').select('id, name, phone, birth_date').eq('company_id', c.id).eq('is_active', true).not('birth_date', 'is', null).limit(5000)
            for (const p of (people ?? []).filter(p => String(p.birth_date).slice(5) === md).slice(0, 30)) {
                const phone = waPhone(p.phone)
                if (!phone) continue
                const r = await sendOnce(db, alice, { companyId: c.id, customerId: p.id, phone, kind: 'birthday', ref: `${today.slice(0, 4)}:${p.id}`, text: fill(auto.birthday_text, { nome: (p.name ?? '').split(' ')[0], loja: c.name ?? '' }) })
                if (r.sent) sent++
            }
        }

        if (auto.review && c.google_review_url) {
            const day = addDays(today, -auto.review_days)
            const { data: orders } = await db.from('service_orders')
                .select('id, equipment_description, title, customer_id, customers(name, phone)')
                .eq('company_id', c.id).eq('status', 'faturada')
                .gte('updated_at', `${day}T00:00:00-03:00`).lt('updated_at', `${addDays(day, 1)}T00:00:00-03:00`).limit(50)
            for (const o of orders ?? []) {
                const cu = Array.isArray(o.customers) ? o.customers[0] : o.customers
                const phone = waPhone(cu?.phone)
                if (!phone || !o.customer_id) continue
                const r = await sendOnce(db, alice, { companyId: c.id, customerId: o.customer_id, phone, kind: 'review', ref: o.id, text: fill(auto.review_text, { nome: (cu?.name ?? '').split(' ')[0], loja: c.name ?? '', aparelho: o.equipment_description || o.title || 'aparelho', link: c.google_review_url }) })
                if (r.sent) sent++
            }
        }
    }
    return NextResponse.json({ sent })
}

export const POST = GET
