import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { Package, Smartphone, CheckCircle2, Clock, MapPin, SearchCode, ShieldCheck, Wrench, AlertTriangle, MessageSquare, Star, MessageCircle, User } from 'lucide-react'
import Image from 'next/image'
import CustomerRatingForm from '@/components/tracking/CustomerRatingForm'

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
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Minimalist Header */}
            <header className="h-16 md:h-20 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {company?.logo_url ? (
                        <Image src={company.logo_url} alt={company.name} width={40} height={40} className="rounded-lg object-contain" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {company?.name?.charAt(0) || 'N'}
                        </div>
                    )}
                    <div>
                        <h1 className="font-bold text-sm md:text-base tracking-tight">{company?.name || 'Nexus OS'}</h1>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">Acompanhamento de OS</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Número da OS</p>
                    <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{os.order_number}</p>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-6 md:space-y-8">
                {/* Status Hero Card */}
                <div className={`rounded-[2rem] p-6 md:p-10 border ${statusCfg.border} ${statusCfg.bg} flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none" />

                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shrink-0 bg-white dark:bg-black/50 shadow-xl border ${statusCfg.border}`}>
                        {statusCfg.icon && <div className="scale-150">{statusCfg.icon}</div>}
                    </div>

                    <div className="flex-1 z-10">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Status Atual</p>
                        <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${statusCfg.text} mb-2`}>{statusCfg.label}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-md">
                            Atualizado em: {formatDateTime(os.updated_at)}
                        </p>
                    </div>
                </div>

                {/* Rating Section (Visible if completed) */}
                {isFinished && (
                    <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] shadow-lg p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-[0.02] pointer-events-none">
                            <Star className="w-64 h-64" />
                        </div>

                        <div className="relative z-10 max-w-xl mx-auto text-center space-y-6">
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">Como foi o nosso serviço?</h3>
                                <p className="text-sm text-slate-500">Sua avaliação é muito importante para continuarmos melhorando nosso atendimento.</p>
                            </div>

                            {hasRated ? (
                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-6 border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-center gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-8 h-8 ${star <= ratingData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-700'}`}
                                            />
                                        ))}
                                    </div>
                                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" /> Avaliação Recebida!
                                    </h4>
                                    {ratingData.comment && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{ratingData.comment}"</p>
                                    )}
                                </div>
                            ) : (
                                <CustomerRatingForm token={token} />
                            )}
                        </div>
                    </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Customer Details */}
                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold tracking-tight">Dados do Cliente</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Nome</p>
                                <p className="font-medium">{os.customers?.name}</p>
                            </div>
                            {os.customers?.phone && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Telefone</p>
                                    <p className="font-medium">{os.customers.phone}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Device Details */}
                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold tracking-tight">Detalhes do Aparelho</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Aparelho/Modelo</p>
                                <p className="font-medium">{os.title}</p>
                            </div>
                            {os.equipment_description && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Descrição Adicional</p>
                                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">{os.equipment_description}</p>
                                </div>
                            )}
                            {os.equipment_serial && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Num. de Série (IMEI)</p>
                                    <p className="font-mono text-sm bg-slate-100 dark:bg-white/5 px-2 py-1 rounded inline-block">{os.equipment_serial}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Problem Details */}
                    <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <SearchCode className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold tracking-tight">Relato do Problema</h3>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                            {os.problem_description || 'Nenhum problema relatado.'}
                        </p>
                    </div>

                    {/* Solution (If finished) */}
                    {(isFinished && os.solution_applied) && (
                        <div className="md:col-span-2 rounded-3xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold tracking-tight text-emerald-900 dark:text-emerald-400">Solução Aplicada</h3>
                            </div>
                            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed font-medium">
                                {os.solution_applied}
                            </p>
                        </div>
                    )}

                    {/* Financial Summary */}
                    <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Custo Estimado / Final</p>
                            <div className="flex items-end gap-3">
                                {isFinished ? (
                                    <span className="text-3xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400">
                                        {formatCurrency(os.final_cost || os.estimated_cost)}
                                    </span>
                                ) : (
                                    <>
                                        <span className="text-3xl font-black tracking-tighter">
                                            {formatCurrency(os.estimated_cost)}
                                        </span>
                                        <span className="text-sm text-slate-400 pb-1 font-medium">(Estimado)</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-6 w-full md:w-auto text-sm">
                            <div>
                                <p className="text-slate-400 mb-1">Entrada</p>
                                <p className="font-bold">{formatDate(os.created_at)}</p>
                            </div>
                            {os.completed_at && (
                                <div>
                                    <p className="text-slate-400 mb-1">Conclusão</p>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatDate(os.completed_at)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warranty Terms Section */}
                    {company?.warranty_terms && (
                        <div className="md:col-span-2 rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 md:p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold tracking-tight">Termos de Garantia e Condições</h3>
                                </div>
                                {os.terms_accepted && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Aceito pelo Cliente
                                    </div>
                                )}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400/80 leading-relaxed font-medium bg-slate-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200/50 dark:border-white/5 whitespace-pre-line">
                                {company.warranty_terms}
                            </div>
                        </div>
                    )}
                </div>

                {/* Contact Footer */}
                <div className="text-center pt-8 border-t border-slate-200 dark:border-white/10">
                    <p className="text-sm text-slate-500 mb-4">Dúvidas sobre sua ordem de serviço?</p>
                    <div className="flex items-center justify-center gap-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {company?.phone && (
                            <a href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-500 transition-colors">
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                            </a>
                        )}
                        {company?.email && (
                            <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-indigo-500 transition-colors">
                                <MessageSquare className="w-4 h-4" /> E-mail
                            </a>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
