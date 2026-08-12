import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import MesaClient from './MesaClient'

export default async function AppointmentsPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    if (!user?.company_id) return null

    // Fetch all appointments for the company
    const { data: appointments } = await db
        .from('appointments')
        .select('*, technicians(name), customers(name), service_orders(id, title, order_number)')
        .eq('company_id', user.company_id)
        .order('scheduled_date')

    // Fetch customers, technicians, service orders, payment methods, and active register
    const [
        { data: customers },
        { data: technicians },
        { data: serviceOrders },
        { data: paymentMethods },
        { data: openRegisters }
    ] = await Promise.all([
        db.from('customers').select('id, name, phone').eq('company_id', user.company_id).order('name'),
        db.from('technicians').select('id, name').eq('company_id', user.company_id).order('name'),
        db.from('service_orders').select('*, customers(id, name, phone), technicians(id, name)').eq('company_id', user.company_id).order('order_number', { ascending: false }),
        db.from('payment_methods').select('id, name, code').eq('is_active', true).or(`company_id.eq.${user.company_id},company_id.is.null`),
        db.from('cash_registers').select('id, status').eq('company_id', user.company_id).eq('status', 'open').limit(1)
    ])

    return (
        <MesaClient
            initialAppointments={appointments || []}
            customers={customers || []}
            technicians={technicians || []}
            serviceOrders={serviceOrders || []}
            paymentMethods={paymentMethods || []}
            hasOpenRegister={!!openRegisters && openRegisters.length > 0}
            openRegisterId={openRegisters?.[0]?.id || null}
        />
    )
}
