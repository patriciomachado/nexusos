import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import NewOSForm from '@/components/forms/NewOSForm'

export default async function EditServiceOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    const { id } = await params
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const companyId = user?.company_id
    const { data: company } = await db.from('companies').select('warranty_terms').eq('id', companyId).single()

    if (!companyId) return notFound()

    // Fetch OS details
    const { data: os } = await db
        .from('service_orders')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

    if (!os) notFound()

    // Fetch related data for the form
    const [
        { data: customers },
        { data: technicians },
        { data: serviceTypes },
    ] = await Promise.all([
        db.from('customers').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('technicians').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
        db.from('service_types').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
    ])

    return (
        <div className="animate-fade-in">
            <div className="p-8 border-b border-border bg-card/40 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Editar Ordem de Serviço</h1>
                        <p className="text-muted-foreground/40 text-sm mt-1 uppercase tracking-widest font-black">OS #{os.order_number} · {os.title}</p>
                    </div>
                </div>
            </div>

            <NewOSForm
                customers={customers || []}
                technicians={technicians || []}
                serviceTypes={serviceTypes || []}
                companyId={companyId}
                initialData={os}
                warrantyTerms={company?.warranty_terms}
            />
        </div>
    )
}
