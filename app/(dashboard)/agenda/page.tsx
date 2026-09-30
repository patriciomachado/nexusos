import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { normalizeAutomations, readyChannel } from '@/lib/customers/messages'
import { isOwner } from '@/lib/cash/server'
import AgendaClient, { type Appointment } from './AgendaClient'

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()

export default async function AgendaPage() {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, role, company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) redirect('/dashboard')
    const companyId = user.company_id

    const [{ data: appointments }, { data: technicians }, { data: customers }, { data: orders }, { data: company }, alice] = await Promise.all([
        db.from('appointments')
            .select('*, technicians(name), customers(name, phone), service_orders(id, title, order_number)')
            .eq('company_id', companyId)
            .gte('scheduled_date', daysFromNow(-45)).lte('scheduled_date', daysFromNow(180))
            .order('scheduled_date').limit(2000),
        db.from('technicians').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('customers').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name').limit(3000),
        db.from('service_orders').select('id, title, order_number').eq('company_id', companyId)
            .not('status', 'in', '(faturada,cancelada)').order('created_at', { ascending: false }).limit(300),
        db.from('companies').select('settings').eq('id', companyId).single(),
        readyChannel(db, companyId),
    ])

    const auto = normalizeAutomations((company?.settings as Record<string, unknown> | null)?.automations)

    return (
        <AgendaClient
            initial={(appointments ?? []) as Appointment[]}
            technicians={technicians ?? []}
            customers={customers ?? []}
            serviceOrders={orders ?? []}
            autoReminder={auto.appointment_reminder}
            whatsappReady={!!alice}
            canEditSettings={isOwner(user.role)}
        />
    )
}
