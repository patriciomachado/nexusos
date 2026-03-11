import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Clock, CheckCircle2, MapPin, Wrench, AlertTriangle } from 'lucide-react'
import TrackingClient from '@/components/tracking/TrackingClient'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode; border: string }> = {
    aberta: { label: 'Aberta - Na Fila', bg: 'bg-blue-500/10', text: 'text-blue-500', icon: <Clock className="w-5 h-5 text-blue-500" />, border: 'border-blue-500/20' },
    agendada: { label: 'Agendada', bg: 'bg-purple-500/10', text: 'text-purple-500', icon: <MapPin className="w-5 h-5 text-purple-500" />, border: 'border-purple-500/20' },
    em_andamento: { label: 'Em Andamento', bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: <Wrench className="w-5 h-5 text-yellow-500" />, border: 'border-yellow-500/20' },
    aguardando_pecas: { label: 'Aguardando Peças', bg: 'bg-orange-500/10', text: 'text-orange-500', icon: <AlertTriangle className="w-5 h-5 text-orange-500" />, border: 'border-orange-500/20' },
    concluida: { label: 'Concluída', bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, border: 'border-emerald-500/20' },
    faturada: { label: 'Faturada', bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, border: 'border-emerald-500/20' },
    cancelada: { label: 'Cancelada', bg: 'bg-red-500/10', text: 'text-red-500', icon: <AlertTriangle className="w-5 h-5 text-red-500" />, border: 'border-red-500/20' },
}

export default async function TrackingPage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const db = createAdminClient()

    // Fetch OS by tracking_token + joins
    const { data: os, error } = await db
        .from('service_orders')
        .select(`
            *,
            companies(name, logo_url, phone, email, city, state, warranty_terms),
            customers(name, phone),
            customer_ratings(*)
        `)
        .eq('tracking_token', token)
        .single()

    if (error || !os) {
        notFound()
    }

    const company = os.companies
    const statusCfg = STATUS_CONFIG[os.status] || STATUS_CONFIG['aberta']
    const hasRated = os.customer_ratings && os.customer_ratings.length > 0
    const ratingData = hasRated ? os.customer_ratings[0] : null
    const isFinished = os.status === 'concluida' || os.status === 'faturada'

    return (
        <TrackingClient
            os={os}
            company={company}
            token={token}
            hasRated={hasRated}
            ratingData={ratingData}
            isFinished={isFinished}
            statusCfg={statusCfg}
        />
    )
}
