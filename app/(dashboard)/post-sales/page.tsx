import { redirect } from 'next/navigation'
import { getContext } from '@/lib/security'
import Header from '@/components/layout/Header'
import PostSalesClient, { type Rating, type Delivered } from '@/components/post-sales/PostSalesClient'

export const metadata = { title: 'Pós-venda · Nexus OS' }

type Row = Record<string, unknown>
/** Server-side cutoff (request time). */
function daysAgo(days: number) {
    return new Date(Date.now() - days * 86_400_000).toISOString()
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

export default async function PostSalesPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!['admin', 'owner', 'manager'].includes(ctx.role)) redirect('/dashboard')
    const { db, companyId } = ctx

    const yearAgo = daysAgo(365)
    const recent = daysAgo(45)

    const [ratingsRes, deliveredRes, companyRes] = await Promise.all([
        db.from('customer_ratings')
            .select('id, rating, comment, sentiment, created_at, service_order_id, customers(name, phone), technicians(name), service_orders!inner(id, order_number, title, company_id, tracking_token)')
            .eq('service_orders.company_id', companyId)
            .gte('created_at', yearAgo)
            .order('created_at', { ascending: false })
            .limit(1000),
        db.from('service_orders')
            .select('id, order_number, title, updated_at, tracking_token, customers(name, phone)')
            .eq('company_id', companyId)
            .eq('status', 'faturada')
            .gte('updated_at', recent)
            .order('updated_at', { ascending: false })
            .limit(200),
        db.from('companies').select('name, google_review_url').eq('id', companyId).single(),
    ])

    const ratings: Rating[] = ((ratingsRes.data ?? []) as Row[]).map(r => {
        const customer = one(r.customers as Row | Row[] | null)
        const os = one(r.service_orders as Row | Row[] | null)
        return {
            id: String(r.id),
            rating: Number(r.rating),
            comment: (r.comment as string | null) ?? null,
            sentiment: (r.sentiment as Rating['sentiment']) ?? null,
            created_at: String(r.created_at),
            customer_name: String(customer?.name ?? 'Cliente'),
            customer_phone: (customer?.phone as string | null) ?? null,
            technician: (one(r.technicians as Row | Row[] | null)?.name as string | undefined) ?? null,
            order_id: String(os?.id ?? r.service_order_id ?? ''),
            order_number: String(os?.order_number ?? ''),
            order_title: String(os?.title ?? ''),
        }
    })

    const rated = new Set(ratings.map(r => r.order_id))
    const delivered: Delivered[] = ((deliveredRes.data ?? []) as Row[]).map(o => {
        const customer = one(o.customers as Row | Row[] | null)
        return {
            id: String(o.id),
            order_number: String(o.order_number),
            title: String(o.title ?? ''),
            delivered_at: String(o.updated_at),
            tracking_token: (o.tracking_token as string | null) ?? null,
            customer_name: String(customer?.name ?? 'Cliente'),
            customer_phone: (customer?.phone as string | null) ?? null,
            rated: rated.has(String(o.id)),
        }
    })

    return (
        <div className="min-h-screen bg-background">
            <Header title="Pós-venda" subtitle="Satisfação dos clientes e quem precisa de contato" />
            <PostSalesClient
                ratings={ratings}
                delivered={delivered}
                storeName={String(companyRes.data?.name ?? 'nossa loja')}
                googleReviewUrl={(companyRes.data?.google_review_url as string | null) || null}
            />
        </div>
    )
}
