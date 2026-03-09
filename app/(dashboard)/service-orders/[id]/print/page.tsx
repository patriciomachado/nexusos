import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import Image from 'next/image'
import PrintTrigger from './PrintTrigger'

export default async function PrintOSPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const db = createAdminClient()

    // Fetch OS with all related data
    const { data: os, error } = await db
        .from('service_orders')
        .select(`
            *,
            companies(name, logo_url, phone, email, city, state, address, cnpj, zip_code),
            customers(name, phone, email, cpf_cnpj, address, city, state),
            technicians(name, phone),
            service_order_items(*)
        `)
        .eq('id', id)
        .single()

    if (error || !os) {
        notFound()
    }

    const company = os.companies
    const customer = os.customers
    const items = os.service_order_items || []

    return (
        <div className="bg-white text-black min-h-screen font-sans print:p-0 p-8 flex justify-center">
            {/* 
                We use PrintTrigger to automatically call window.print()
                Since this is a Server Component, we need a small Client Component to handle side-effects 
            */}
            <PrintTrigger />

            <div className="w-[210mm] min-h-[297mm] bg-white print:shadow-none shadow-2xl p-[15mm]">

                {/* Header (Company Info & OS Number) */}
                <header className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                    <div className="flex gap-4 items-center">
                        {company?.logo_url ? (
                            <Image src={company.logo_url} alt={company.name} width={64} height={64} className="object-contain" />
                        ) : (
                            <div className="w-16 h-16 bg-gray-200 border border-black flex items-center justify-center font-bold text-xl uppercase">
                                {company?.name?.charAt(0) || 'N'}
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wide">{company?.name || 'Nexus OS'}</h1>
                            {company?.cnpj && <p className="text-sm">CNPJ: {company.cnpj}</p>}
                            <p className="text-xs text-gray-700">
                                {[company?.address, company?.city, company?.state].filter(Boolean).join(' - ')}
                            </p>
                            <div className="flex gap-3 text-xs text-gray-700 mt-1">
                                {company?.phone && <span>Tel: {company.phone}</span>}
                                {company?.email && <span>Email: {company.email}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <div className="border-4 border-black px-4 py-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Nº OS</p>
                            <p className="text-2xl font-black font-mono">{os.order_number}</p>
                        </div>
                        <p className="text-xs font-bold uppercase mt-2 text-gray-600 tracking-wider text-right max-w-[120px]">Ordem de Serviço</p>
                    </div>
                </header>

                {/* Dates & Status */}
                <div className="grid grid-cols-4 gap-4 mb-6 text-sm border-b border-gray-300 pb-4">
                    <div>
                        <p className="font-bold text-gray-500 text-xs uppercase mb-1">Status Atual</p>
                        <p className="font-semibold uppercase">{os.status.replace('_', ' ')}</p>
                    </div>
                    <div>
                        <p className="font-bold text-gray-500 text-xs uppercase mb-1">Data Entrada</p>
                        <p>{formatDate(os.created_at)}</p>
                    </div>
                    <div>
                        <p className="font-bold text-gray-500 text-xs uppercase mb-1">Data Conclusão</p>
                        <p>{os.completed_at ? formatDate(os.completed_at) : '-'}</p>
                    </div>
                    <div>
                        <p className="font-bold text-gray-500 text-xs uppercase mb-1">Técnico Resp.</p>
                        <p className="font-semibold">{os.technicians?.name || 'Não atribuído'}</p>
                    </div>
                </div>

                {/* Customer Data */}
                <div className="border border-black rounded-lg p-4 mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest bg-gray-100 -mt-[26px] mb-2 px-2 inline-block">Dados do Cliente</h2>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
                        <p><span className="font-bold">Nome:</span> {customer?.name || 'Não informado'}</p>
                        <p><span className="font-bold">CPF/CNPJ:</span> {customer?.cpf_cnpj || '-'}</p>
                        <p><span className="font-bold">Telefone:</span> {customer?.phone || '-'}</p>
                        <p><span className="font-bold">E-mail:</span> {customer?.email || '-'}</p>
                        <p className="col-span-2"><span className="font-bold">Endereço:</span> {[customer?.address, customer?.city, customer?.state].filter(Boolean).join(', ') || '-'}</p>
                    </div>
                </div>

                {/* Equipment & Problem */}
                <div className="grid grid-cols-1 gap-6 mb-6">
                    <div className="border border-black rounded-lg p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest bg-gray-100 -mt-[26px] mb-3 px-2 inline-block">Equipamento & Relato</h2>

                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-start border-b border-gray-200 pb-2">
                                <div>
                                    <p className="font-bold uppercase text-xs text-gray-500 mb-1">Aparelho / Título</p>
                                    <p className="font-semibold text-lg">{os.title}</p>
                                </div>
                                {os.equipment_serial && (
                                    <div className="text-right">
                                        <p className="font-bold uppercase text-xs text-gray-500 mb-1">Num. Série / IMEI</p>
                                        <p className="font-mono bg-gray-100 px-2 py-1 rounded">{os.equipment_serial}</p>
                                    </div>
                                )}
                            </div>

                            {os.equipment_description && (
                                <div className="border-b border-gray-200 pb-2">
                                    <p className="font-bold uppercase text-xs text-gray-500 mb-1">Observações do Equipamento</p>
                                    <p>{os.equipment_description}</p>
                                </div>
                            )}

                            <div>
                                <p className="font-bold uppercase text-xs text-gray-500 mb-1">Defeito Relatado pelo Cliente</p>
                                <p className="italic">{os.problem_description || 'Nenhum defeito relatado.'}</p>
                            </div>
                        </div>
                    </div>

                    {(os.solution_applied || os.internal_notes) && (
                        <div className="border border-black rounded-lg p-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest bg-gray-100 -mt-[26px] mb-3 px-2 inline-block">Parecer Técnico</h2>

                            <div className="space-y-4 text-sm">
                                {os.solution_applied && (
                                    <div>
                                        <p className="font-bold uppercase text-xs text-gray-500 mb-1">Solução Aplicada</p>
                                        <p>{os.solution_applied}</p>
                                    </div>
                                )}
                                {os.internal_notes && (
                                    <div className="pt-2">
                                        <p className="font-bold uppercase text-xs text-gray-500 mb-1">Laudo / Notas Técnicas</p>
                                        <p>{os.internal_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Items & Services Table */}
                {items.length > 0 && (
                    <div className="mb-6">
                        <table className="w-full text-sm border border-black">
                            <thead className="bg-gray-100 border-b border-black">
                                <tr>
                                    <th className="text-left py-2 px-3 font-bold uppercase text-xs">Item / Serviço</th>
                                    <th className="text-center py-2 px-3 font-bold uppercase text-xs">Qtd</th>
                                    <th className="text-right py-2 px-3 font-bold uppercase text-xs">Vlr Unit</th>
                                    <th className="text-right py-2 px-3 font-bold uppercase text-xs">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {items.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="py-2 px-3">{item.item_name}</td>
                                        <td className="py-2 px-3 text-center">{item.quantity}</td>
                                        <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                                        <td className="py-2 px-3 text-right font-semibold">{formatCurrency(item.total_price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Totals & Signature */}
                <div className="flex flex-col gap-12 mt-8">
                    {/* Totals */}
                    <div className="flex justify-between items-start">
                        <div className="text-xs text-gray-500 max-w-[60%]">
                            <p className="mb-2 uppercase font-bold text-black border-b border-black pb-1 inline-block">Atenção</p>
                            <p>O prazo de garantia para os serviços executados é de {os.warranty_months} meses a partir da data de entrega.</p>
                            <p className="mt-1">Aparelhos não retirados em até 90 dias poderão ser vendidos para custear despesas (Lei aplicável vigente).</p>
                        </div>
                        <div className="bg-gray-100 p-4 border border-black rounded w-[35%]">
                            {os.labor_cost > 0 && (
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Serviços / Mão de Obra:</span>
                                    <span>{formatCurrency(os.labor_cost)}</span>
                                </div>
                            )}
                            {os.parts_cost > 0 && (
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Peças:</span>
                                    <span>{formatCurrency(os.parts_cost)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-black border-t-2 border-black pt-2 mt-2">
                                <span>TOTAL:</span>
                                <span>{formatCurrency(os.final_cost || os.estimated_cost)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-12 pt-16">
                        <div className="text-center">
                            <div className="border-t border-black pt-2">
                                <p className="font-bold text-sm">Assinatura do Técnico</p>
                                <p className="text-xs text-gray-500 mt-1">{os.technicians?.name}</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-black pt-2">
                                <p className="font-bold text-sm">Assinatura do Cliente</p>
                                <p className="text-xs text-gray-500 mt-1">{customer?.name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center border-t border-dashed border-gray-400 mt-12 pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Acompanhe sua OS online</p>
                    {os.tracking_token && (
                        <p className="font-mono text-xs max-w-sm mx-auto p-1 bg-gray-50 border border-gray-200">
                            nexussistemas.com/tracking/{os.tracking_token}
                        </p>
                    )}
                </div>

            </div>
        </div>
    )
}
