import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const body = await req.json()
    const { type, title, message, userId, relatedEntityType, relatedEntityId } = body

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

    const { db, companyId } = ctx
    const { searchParams } = new URL(req.url)
    const generate = searchParams.get('generate') === 'true'

    if (generate) {
        await generateNotifications(db, companyId)
    }

    const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count: data?.length || 0 })
}

async function generateNotifications(db: any, companyId: string) {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 1. OS Atrasadas (+5, 10, 20, 30 dias)
    const daysToCheck = [5, 10, 20, 30]
    for (const days of daysToCheck) {
        const targetDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const { data: oldOS } = await db
            .from('service_orders')
            .select('id, order_number, title, created_at, status, technicians(id, name)')
            .eq('company_id', companyId)
            .in('status', ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas'])
            .gte('created_at', `${targetDate}T00:00:00.000Z`)
            .lt('created_at', `${targetDate}T23:59:59.999Z`)

        if (oldOS && oldOS.length > 0) {
            for (const os of oldOS) {
                const existingNotif = await db
                    .from('notifications')
                    .select('id')
                    .eq('company_id', companyId)
                    .eq('related_entity_id', os.id)
                    .like('title', `%${days} dias%`)
                    .maybeSingle()

                if (!existingNotif) {
                    const techName = os.technicians?.name || 'Não atribuído'
                    await db.from('notifications').insert({
                        company_id: companyId,
                        type: 'push',
                        title: `OS aberta há ${days} dias`,
                        message: `A OS #${os.order_number} - ${os.title} está aberta há ${days} dias. Técnico: ${techName}`,
                        status: 'pending',
                        related_entity_type: 'service_order',
                        related_entity_id: os.id
                    })
                }
            }
        }
    }

    // 2. Estoque Baixo
    const { data: lowStockItems } = await db
        .from('inventory_items')
        .select('id, name, quantity_in_stock, minimum_quantity')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .filter('quantity_in_stock', 'lte', 'minimum_quantity')

    if (lowStockItems && lowStockItems.length > 0) {
        const existingStockNotif = await db
            .from('notifications')
            .select('id')
            .eq('company_id', companyId)
            .eq('related_entity_type', 'low_stock')
            .gte('created_at', `${today}T00:00:00.000Z`)
            .maybeSingle()

        if (!existingStockNotif) {
            const itemsList = lowStockItems.slice(0, 3).map((i: any) => i.name).join(', ')
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

    // 3. Agendamentos de Amanhã
    const { data: tomorrowAppts } = await db
        .from('appointments')
        .select('id, scheduled_date, service_type, customers(name)')
        .eq('company_id', companyId)
        .gte('scheduled_date', `${tomorrow}T00:00:00.000Z`)
        .lt('scheduled_date', `${tomorrow}T23:59:59.999Z`)
        .eq('status', 'scheduled')

    if (tomorrowAppts && tomorrowAppts.length > 0) {
        const existingApptNotif = await db
            .from('notifications')
            .select('id')
            .eq('company_id', companyId)
            .eq('related_entity_type', 'appointments_tomorrow')
            .gte('created_at', `${today}T00:00:00.000Z`)
            .maybeSingle()

        if (!existingApptNotif) {
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

    // 6. Recebimentos Pendentes (crediário vence em 5 dias)
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: pendingPayments } = await db
        .from('payments')
        .select('id, amount, due_date, customers(name)')
        .eq('company_id', companyId)
        .eq('payment_status', 'pending')
        .gte('due_date', today)
        .lte('due_date', fiveDaysFromNow)

    if (pendingPayments && pendingPayments.length > 0) {
        const totalPending = pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
        
        const existingPayNotif = await db
            .from('notifications')
            .select('id')
            .eq('company_id', companyId)
            .eq('related_entity_type', 'pending_payments')
            .gte('created_at', `${today}T00:00:00.000Z`)
            .maybeSingle()

        if (!existingPayNotif) {
            await db.from('notifications').insert({
                company_id: companyId,
                type: 'push',
                title: `${pendingPayments.length} recebimento(s) pendente(s)`,
                message: `R$ ${totalPending.toFixed(2)} em recebimentos próximos (próximos 5 dias)`,
                status: 'pending',
                related_entity_type: 'pending_payments',
                related_entity_id: pendingPayments[0].id
            })
        }
    }
}