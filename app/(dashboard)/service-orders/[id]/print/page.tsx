import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { readDocuments } from '@/lib/settings/documents'
import { statusMeta } from '@/lib/os/status'
import PrintTrigger from './PrintTrigger'

type Item = { id: string; item_name: string; quantity: number; unit_price: number; total_price: number }
type Check = { id: string; text: string; completed: boolean }

function Box({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border p-4 mb-5" style={{ borderColor: accent }}>
            <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>{title}</h2>
            {children}
        </section>
    )
}

/** A4 service order for printing or saving as PDF, styled by Configurações → Recibo e OS. */
export default async function PrintOSPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) redirect('/dashboard')

    const { data: os } = await db
        .from('service_orders')
        .select(`
            *,
            companies(name, logo_url, phone, email, city, state, address, cnpj, zip_code, warranty_terms, settings),
            customers(name, phone, email, cpf_cnpj, address, city, state),
            technicians(name, phone),
            service_order_items(*)
        `)
        .eq('id', id)
        .eq('company_id', user.company_id)
        .maybeSingle()
    if (!os) notFound()

    const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)
    const company = one(os.companies) as Record<string, string | null> & { settings?: unknown } | null
    const customer = one(os.customers) as Record<string, string | null> | null
    const tech = one(os.technicians) as { name?: string } | null
    const items = (os.service_order_items ?? []) as Item[]
    const checklist = (Array.isArray(os.checklist_progress) ? os.checklist_progress : []) as Check[]
    const doc = readDocuments(company?.settings)
    const accent = doc.accent
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://nexusgestor.com').replace(/\/$/, '')
    const months = Number(os.warranty_months) || 0
    const terms = doc.os_terms || (months > 0 ? `Garantia de ${months} ${months === 1 ? 'mês' : 'meses'} para o serviço executado, a partir da data de entrega.` : '')

    return (
        <div className="bg-white text-black min-h-screen font-sans print:p-0 p-4 sm:p-8 flex justify-center overflow-x-auto">
            <PrintTrigger />
            {/* Shrinks the A4 sheet to fit a phone screen; printing is unaffected. */}
            <style>{'@media screen and (max-width: 480px){.os-sheet{zoom:.44}} @media screen and (min-width: 481px) and (max-width: 860px){.os-sheet{zoom:.8}}'}</style>
            <div className="os-sheet w-[210mm] min-h-[297mm] bg-white print:shadow-none shadow-2xl p-[15mm] shrink-0">
                <header className="flex justify-between items-start border-b-2 pb-4 mb-6" style={{ borderColor: accent }}>
                    <div className="flex gap-4 items-center">
                        {doc.show_logo && company?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={company.logo_url} alt="" className="w-16 h-16 object-contain" />
                        ) : doc.show_logo ? (
                            <div className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl text-white" style={{ background: accent }}>
                                {company?.name?.charAt(0)?.toUpperCase() || 'N'}
                            </div>
                        ) : null}
                        <div>
                            <h1 className="text-xl font-bold">{company?.name || 'Loja'}</h1>
                            {doc.tagline && <p className="text-sm" style={{ color: accent }}>{doc.tagline}</p>}
                            {company?.cnpj && <p className="text-xs text-gray-700">CNPJ {company.cnpj}</p>}
                            <p className="text-xs text-gray-700">{[company?.address, company?.city, company?.state].filter(Boolean).join(' · ')}</p>
                            <p className="text-xs text-gray-700">{[company?.phone, company?.email].filter(Boolean).join(' · ')}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Ordem de serviço</p>
                        <p className="text-3xl font-black font-mono" style={{ color: accent }}>{os.order_number}</p>
                    </div>
                </header>

                <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
                    <div><p className="text-[11px] font-bold uppercase text-gray-500">Situação</p><p className="font-semibold">{statusMeta(os.status).label}</p></div>
                    <div><p className="text-[11px] font-bold uppercase text-gray-500">Entrada</p><p>{formatDate(os.created_at)}</p></div>
                    <div><p className="text-[11px] font-bold uppercase text-gray-500">Conclusão</p><p>{os.completed_at ? formatDate(os.completed_at) : '—'}</p></div>
                    <div><p className="text-[11px] font-bold uppercase text-gray-500">Técnico</p><p className="font-semibold">{tech?.name || '—'}</p></div>
                </div>

                <Box title="Cliente" accent={accent}>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-8 text-sm">
                        <p><b>Nome:</b> {customer?.name || 'Não informado'}</p>
                        <p><b>CPF/CNPJ:</b> {customer?.cpf_cnpj || '—'}</p>
                        <p><b>Telefone:</b> {customer?.phone || '—'}</p>
                        <p><b>E-mail:</b> {customer?.email || '—'}</p>
                        <p className="col-span-2"><b>Endereço:</b> {[customer?.address, customer?.city, customer?.state].filter(Boolean).join(', ') || '—'}</p>
                    </div>
                </Box>

                <Box title="Aparelho e defeito" accent={accent}>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <p className="font-semibold text-lg">{os.title}</p>
                            {os.equipment_serial && <p className="font-mono bg-gray-100 px-2 py-1 rounded h-fit">IMEI/Série {os.equipment_serial}</p>}
                        </div>
                        {os.equipment_description && <p><b>Estado do aparelho:</b> {os.equipment_description}</p>}
                        <p><b>Defeito relatado:</b> <i>{os.problem_description || 'Não informado.'}</i></p>
                        {checklist.length > 0 && (
                            <div>
                                <p className="font-bold text-[11px] uppercase text-gray-500 mb-1">Checklist de entrada</p>
                                <div className="grid grid-cols-3 gap-y-1 gap-x-4 text-xs">
                                    {checklist.map(c => (
                                        <span key={c.id} className={c.completed ? 'font-semibold' : 'text-gray-400'}>{c.completed ? '✓' : '✗'} {c.text}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Box>

                {/* Internal notes stay out: they hold things like the device PIN. */}
                {os.solution_applied && (
                    <Box title="Parecer técnico" accent={accent}>
                        <p className="text-sm">{os.solution_applied}</p>
                    </Box>
                )}

                {items.length > 0 && (
                    <table className="w-full text-sm mb-5 border" style={{ borderColor: accent }}>
                        <thead className="text-white" style={{ background: accent }}>
                            <tr>
                                <th className="text-left py-2 px-3 text-xs uppercase">Item / serviço</th>
                                <th className="text-center py-2 px-3 text-xs uppercase">Qtd</th>
                                <th className="text-right py-2 px-3 text-xs uppercase">Unitário</th>
                                <th className="text-right py-2 px-3 text-xs uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map(i => (
                                <tr key={i.id}>
                                    <td className="py-2 px-3">{i.item_name}</td>
                                    <td className="py-2 px-3 text-center">{i.quantity}</td>
                                    <td className="py-2 px-3 text-right">{formatCurrency(i.unit_price)}</td>
                                    <td className="py-2 px-3 text-right font-semibold">{formatCurrency(i.total_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <div className="flex justify-between items-start gap-6 mt-6">
                    <div className="text-xs text-gray-600 flex-1 whitespace-pre-line">
                        {(terms || doc.abandon_days > 0) && <p className="uppercase font-bold mb-1" style={{ color: accent }}>Termos</p>}
                        {terms && <p>{terms}</p>}
                        {doc.abandon_days > 0 && <p className="mt-1">Aparelhos não retirados em até {doc.abandon_days} dias após o aviso de pronto poderão ser vendidos para cobrir as despesas do serviço.</p>}
                    </div>
                    <div className="bg-gray-50 p-4 border rounded w-[38%]" style={{ borderColor: accent }}>
                        {Number(os.labor_cost) > 0 && <p className="flex justify-between text-sm"><span>Mão de obra</span><span>{formatCurrency(os.labor_cost)}</span></p>}
                        {Number(os.parts_cost) > 0 && <p className="flex justify-between text-sm"><span>Peças</span><span>{formatCurrency(os.parts_cost)}</span></p>}
                        <p className="flex justify-between text-lg font-black border-t-2 pt-2 mt-2" style={{ borderColor: accent }}><span>TOTAL</span><span>{formatCurrency(os.final_cost || os.estimated_cost)}</span></p>
                    </div>
                </div>

                <div className={`grid ${doc.show_tech_signature ? 'grid-cols-2' : 'grid-cols-1 max-w-sm mx-auto'} gap-12 pt-16`}>
                    {doc.show_tech_signature && (
                        <div className="text-center flex flex-col justify-end">
                            <div className="h-16 mb-1" />
                            <div className="border-t border-black pt-2">
                                <p className="font-bold text-sm">Técnico</p>
                                <p className="text-xs text-gray-500 mt-1">{tech?.name}</p>
                            </div>
                        </div>
                    )}
                    <div className="text-center flex flex-col justify-end">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {os.signature_url ? <img src={os.signature_url} alt="Assinatura do cliente" className="max-h-16 object-contain mx-auto mb-1" /> : <div className="h-16 mb-1" />}
                        <div className="border-t border-black pt-2">
                            <p className="font-bold text-sm">Cliente</p>
                            <p className="text-xs text-gray-500 mt-1">{customer?.name}</p>
                        </div>
                    </div>
                </div>

                {doc.show_tracking && os.tracking_token && (
                    <div className="text-center border-t border-dashed border-gray-400 mt-12 pt-4">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Acompanhe sua OS pela internet</p>
                        <p className="font-mono text-xs">{appUrl.replace(/^https?:\/\//, '')}/tracking/{os.tracking_token}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
