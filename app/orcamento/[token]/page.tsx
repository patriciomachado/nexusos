import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CheckCircle2, MessageCircle, ShieldCheck, Smartphone } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import { digitsOnly } from '@/lib/alice/phone'
import { TIER_INFO } from '@/lib/parts/quotes'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function waLink(phone: string, text: string) {
    let d = digitsOnly(phone)
    if (d && d.length <= 11) d = `55${d}`
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

interface Option { tipo: string | null; valor: number }

export default async function OrcamentoPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const db = createAdminClient()

    const { data: quote, error } = await db
        .from('part_quotes')
        .select('company_id, device_model, service, options, valid_until, created_at, companies(name, logo_url, phone, warranty_terms)')
        .eq('token', token)
        .single()

    if (error || !quote) notFound()

    const company = (Array.isArray(quote.companies) ? quote.companies[0] : quote.companies) as
        { name: string; logo_url: string | null; phone: string | null; warranty_terms: string | null } | null
    const options = (quote.options as Option[]) ?? []
    const expired = new Date(quote.valid_until) < new Date()
    const validDate = new Date(quote.valid_until).toLocaleDateString('pt-BR')

    const { data: methods } = await db
        .from('payment_methods')
        .select('name')
        .or(`company_id.eq.${quote.company_id},company_id.is.null`)
        .eq('is_active', true)
        .order('name')

    const waText = `Olá! Vi o orçamento de ${quote.service} para ${quote.device_model} e quero confirmar.`

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100">
            <header className="border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a]">
                <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
                    {company?.logo_url ? (
                        <Image src={company.logo_url} alt={company.name} width={40} height={40} className="rounded-lg object-contain" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                            {(company?.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="text-[17px] font-semibold truncate">{company?.name ?? 'Assistência técnica'}</span>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-5 py-8 space-y-5">
                <div>
                    <p className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Orçamento</p>
                    <h1 className="text-[24px] font-bold leading-tight mt-1 flex items-center gap-2">
                        <Smartphone className="w-6 h-6 text-slate-400 shrink-0" /> {quote.device_model}
                    </h1>
                    <p className="text-[16px] text-slate-500 dark:text-slate-400 mt-0.5">{quote.service}</p>
                </div>

                {expired ? (
                    <div className="rounded-3xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20 p-6 text-center">
                        <p className="text-[16px] font-medium text-amber-800 dark:text-amber-300">Este orçamento venceu em {validDate}.</p>
                        <p className="text-[14px] text-amber-700/80 dark:text-amber-400/80 mt-1">Os preços podem ter mudado — fale com a loja para um novo valor.</p>
                    </div>
                ) : (
                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] shadow-sm divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                        {options.map((o, i) => {
                            const info = o.tipo ? TIER_INFO[o.tipo] : null
                            return (
                                <div key={i} className="px-6 py-4 space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[16px] font-medium">{o.tipo ?? quote.service}</span>
                                        <span className="text-[20px] font-bold tabular-nums">{brl(o.valor)}</span>
                                    </div>
                                    {info && (
                                        <ul className="space-y-1">
                                            {info.bullets.map(b => (
                                                <li key={b} className="flex items-start gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {b}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center px-2">
                    Valores a partir de, sujeitos à avaliação técnica presencial.{!expired && ` Válido até ${validDate}.`}
                </p>

                {!!methods?.length && (
                    <div className="flex flex-wrap justify-center gap-2">
                        {methods.map(m => (
                            <span key={m.name} className="h-8 px-3 rounded-full bg-slate-100 dark:bg-white/5 text-[13px] font-medium inline-flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {m.name}
                            </span>
                        ))}
                    </div>
                )}

                {company?.warranty_terms && (
                    <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-4 flex gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">{company.warranty_terms}</p>
                    </div>
                )}

                {company?.phone && (
                    <a
                        href={waLink(company.phone, waText)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition"
                    >
                        <MessageCircle className="w-5 h-5" /> Confirmar no WhatsApp
                    </a>
                )}
            </main>
        </div>
    )
}
