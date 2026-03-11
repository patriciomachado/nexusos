import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import AppointmentsCalendar from '@/components/appointments/AppointmentsCalendar'
import { redirect } from 'next/navigation'

export default async function AppointmentsPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    if (!user?.company_id) return null

    // Fetch all appointments for the company (calendar logic will handle filtering)
    const { data: appointments } = await db
        .from('appointments')
        .select('*, technicians(name), customers(name), service_orders(id, title, order_number)')
        .eq('company_id', user.company_id)
        .order('scheduled_date')

    // Fetch customers and technicians for the search fields
    const { data: customers } = await db
        .from('customers')
        .select('id, name')
        .eq('company_id', user.company_id)
        .order('name')

    const { data: technicians } = await db
        .from('technicians')
        .select('id, name')
        .eq('company_id', user.company_id)
        .order('name')

    const { data: serviceOrders } = await db
        .from('service_orders')
        .select('id, order_number, title')
        .eq('company_id', user.company_id)
        .order('order_number', { ascending: false })

    return (
        <div className="bg-[#0f172a] min-h-screen text-foreground h-screen flex overflow-hidden">
            <AppointmentsCalendar
                initialAppointments={appointments || []}
                customers={customers || []}
                technicians={technicians || []}
                serviceOrders={serviceOrders || []}
            />
        </div>
    )
}
