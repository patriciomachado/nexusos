import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { dateStringInZone, addDays } from '@/lib/tasks/dates'

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const body = await req.json()
    const { title, message, userId, relatedEntityType, relatedEntityId } = body

    const { data, error } = await db
        .from('notifications')
        .insert({
            company_id: companyId,
            user_id: userId,
            type: 'push',
            title,
            message,
            status: 'pending',
            related_entity_type: relatedEntityType,
            related_entity_id: relatedEntityId
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const { searchParams } = new URL(req.url)
    const generate = searchParams.get('generate') === 'true'

    if (generate) {
        try {
            await generateNotifications(db, companyId)
        } catch (error) {
            console.error('Error generating notifications:', error)
        }
    }

    const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('company_id', companyId)
        .or(`user_id.is.null,user_id.eq.${dbUser.id}`)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const unread = (data || []).filter(n => n.status !== 'read').length
    return NextResponse.json({ data, count: data?.length || 0, unread })
}

/** Marks one notification (`{ id }`) or all of them (`{ all: true }`) as read. */
export async function PATCH(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const body = await req.json().catch(() => ({}))
    const now = new Date().toISOString()

    let query = db
        .from('notifications')
        .update({ status: 'read', read_at: now })
        .eq('company_id', companyId)
        .or(`user_id.is.null,user_id.eq.${dbUser.id}`)

    if (body?.all === true) {
        query = query.neq('status', 'read')
    } else if (typeof body?.id === 'string') {
        query = query.eq('id', body.id)
    } else {
        return NextResponse.json({ error: 'Informe id ou all' }, { status: 400 })
    }

    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

const OPEN_OS_STATUSES = ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas']
const OS_AGE_MILESTONES = [30, 20, 10, 5]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateNotifications(db: any, companyId: string) {
    const today = dateStringInZone()
    const tomorrow = addDays(today, 1)
    const startOfToday = `${today}T00:00:00-03:00`

    // 1. OS abertas há 5, 10, 20 ou 30 dias (uma notificação por marco)
    const oldestRelevant = new Date(Date.now() - 5 * 86_400_000).toISOString()
    const { data: openOS } = await db
        .from('service_orders')
        .select('id, order_number, title, created_at, technicians(name)')
        .eq('company_id', companyId)
        .in('status', OPEN_OS_STATUSES)
        .lte('created_at', oldestRelevant)
        .limit(200)

    if (openOS && openOS.length > 0) {
        const ids = openOS.map((os: { id: string }) => os.id)
        const { data: existing } = await db
            .from('notifications')
            .select('related_entity_id, title')
            .eq('company_id', companyId)
            .eq('related_entity_type', 'service_order')
            .in('related_entity_id', ids)
        const seen = new Set((existing || []).map((n: { related_entity_id: string; title: string }) => `${n.related_entity_id}|${n.title}`))

        const rows = []
        for (const os of openOS) {
            const ageDays = Math.floor((Date.now() - new Date(os.created_at).getTime()) / 86_400_000)
            const milestone = OS_AGE_MILESTONES.find(m => ageDays >= m)
            if (!milestone) continue
            const title = `OS aberta há ${milestone} dias`
            if (seen.has(`${os.id}|${title}`)) continue
            rows.push({
                company_id: companyId,
                type: 'push',
                title,
                message: `A OS #${os.order_number} - ${os.title} está aberta há ${ageDays} dias. Técnico: ${os.technicians?.name || 'não atribuído'}`,
                status: 'pending',
                related_entity_type: 'service_order',
                related_entity_id: os.id,
            })
        }
        if (rows.length > 0) await db.from('notifications').insert(rows)
    }

    // 2. Estoque baixo (comparação coluna × coluna feita aqui, o PostgREST não compara colunas)
    const { data: stockItems } = await db
        .from('inventory_items')
        .select('id, name, quantity_in_stock, minimum_quantity')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .gt('minimum_quantity', 0)
        .limit(1000)

    const lowStockItems = (stockItems || []).filter(
        (i: { quantity_in_stock: number; minimum_quantity: number }) => Number(i.quantity_in_stock) <= Number(i.minimum_quantity)
    )

    if (lowStockItems.length > 0) {
        const { data: existingStockNotif } = await db
            .from('notifications')
            .select('id')
            .eq('company_id', companyId)
            .eq('related_entity_type', 'low_stock')
            .gte('created_at', startOfToday)
            .limit(1)

        if (!existingStockNotif?.length) {
            const itemsList = lowStockItems.slice(0, 3).map((i: { name: string }) => i.name).join(', ')
            const more = lowStockItems.length > 3 ? ` e mais ${lowStockItems.length - 3}` : ''
            await db.from('notifications').insert({
                company_id: companyId,
                type: 'push',
                title: `${lowStockItems.length} produtos com estoque baixo`,
                message: `${itemsList}${more} precisam de reposição`,
                status: 'pending',
                related_entity_type: 'low_stock',
                related_entity_id: companyId
            })
        }
    }

    // 3. Agendamentos de amanhã
    const { data: tomorrowAppts } = await db
        .from('appointments')
        .select('id')
        .eq('company_id', companyId)
        .gte('scheduled_date', `${tomorrow}T00:00:00-03:00`)
        .lt('scheduled_date', `${addDays(tomorrow, 1)}T00:00:00-03:00`)
        .in('status', ['scheduled', 'confirmed'])

    if (tomorrowAppts && tomorrowAppts.length > 0) {
        const { data: existingApptNotif } = await db
            .from('notifications')
            .select('id')
            .eq('company_id', companyId)
            .eq('related_entity_type', 'appointments_tomorrow')
            .gte('created_at', startOfToday)
            .limit(1)

        if (!existingApptNotif?.length) {
            await db.from('notifications').insert({
                company_id: companyId,
                type: 'push',
                title: `${tomorrowAppts.length} agendamento(s) para amanhã`,
                message: `Você tem ${tomorrowAppts.length} serviço(s) agendado(s) para amanhã`,
                status: 'pending',
                related_entity_type: 'appointments_tomorrow',
                related_entity_id: tomorrowAppts[0].id
            })
        }
    }

    // 4. Recebimentos pendentes que vencem nos próximos 5 dias
    const { data: pendingPayments } = await db
        .from('payments')
        .select('id, amount')
        .eq('company_id', companyId)
        .eq('payment_status', 'pending')
        .gte('due_date', today)
        .lte('due_date', addDays(today, 5))

    if (pendingPayments && pendingPayments.length > 0) {
        const totalPending: number = pendingPayments.reduce((sum: number, p: { amount: number }) => sum + (Number(p.amount) || 0), 0)

        const { data: existingPayNotif } = await db
            .from('notifications')
            .select('id')
            .eq('company_id', companyId)
            .eq('related_entity_type', 'pending_payments')
            .gte('created_at', startOfToday)
            .limit(1)

        if (!existingPayNotif?.length) {
            await db.from('notifications').insert({
                company_id: companyId,
                type: 'push',
                title: `${pendingPayments.length} recebimento(s) pendente(s)`,
                message: `R$ ${totalPending.toFixed(2)} em recebimentos nos próximos 5 dias`,
                status: 'pending',
                related_entity_type: 'pending_payments',
                related_entity_id: pendingPayments[0].id
            })
        }
    }
}
