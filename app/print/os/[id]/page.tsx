import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Image from 'next/image'
import PrintTrigger from './PrintTrigger'

export default async function PrintOSPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const db = createAdminClient()

    const { data: os, error } = await db
        .from('service_orders')
        .select(`
            *,
            companies(name, logo_url, phone, email, city, state, address, cnpj, zip_code, warranty_terms),
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
            <PrintTrigger />

            <div className="w-[210mm] min-h-[297mm] bg-white print:shadow-none shadow-2xl p-[15mm]">

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
                            {company?.phone && (
                                <a
                                    href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`}
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1 no-underline"
                                >
                                    WhatsApp: {company.phone}
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="border-4 border-black px-4 py-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">OS Nº</p>
                            <p className="text-2xl font-black font-mono">{os.order_number}</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-4 gap-4 mb-6 text-sm border-b border-gray-300 pb-4">
                    <div>
                        <p className="font-bold text-gray-500 text-xs uppercase mb-1">Status</p>
                        <p className="font-semibold uppercase">{os.status.replace('_', ' ')}</p>
                    </div>
                    <div>
                        <p className="font-bold text-gray-500 text-xs uppercase mb-1">Entrada</p>
                        <p>{formatDate(os.created_at)}</p>
                    </div>
                    <div>
                        <p className="font-bold text-gray-500 text-xs uppercase mb-1">Conclusão</p>
                        <p>{os.completed_at ? formatDate(os.completed_at) : '-'}</p>
                    </div>
                </div>

                <div className="border border-black rounded-lg p-4 mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest bg-gray-100 -mt-[26px] mb-2 px-2 inline-block text-black">Dados do Cliente</h2>
                    <div className="grid grid-cols-2 gap-y-1 text-sm">
                        <p><span className="font-bold">Nome:</span> {customer?.name}</p>
                        <p><span className="font-bold">CPF/CNPJ:</span> {customer?.cpf_cnpj}</p>
                        <p><span className="font-bold">Tel:</span> {customer?.phone}</p>
                        <p className="col-span-2"><span className="font-bold">Endereço:</span> {[customer?.address, customer?.city, customer?.state].filter(Boolean).join(', ')}</p>
                    </div>
                </div>

                <div className="border border-black rounded-lg p-4 mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest bg-gray-100 -mt-[26px] mb-3 px-2 inline-block text-black">Equipamento & Relato</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                            <p className="font-semibold text-lg">{os.title}</p>
                            {os.equipment_serial && <p className="font-mono text-xs">{os.equipment_serial}</p>}
                        </div>
                        <p><span className="font-bold uppercase text-[10px] text-gray-500 block">Defeito:</span> {os.problem_description}</p>
                    </div>
                </div>

                {items.length > 0 && (
                    <table className="w-full text-sm border border-black mb-6">
                        <thead className="bg-gray-100 border-b border-black text-xs font-black uppercase">
                            <tr>
                                <th className="text-left p-2">Item</th>
                                <th className="text-center p-2">Qtd</th>
                                <th className="text-right p-2">Vlr Unit</th>
                                <th className="text-right p-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="p-2">{item.item_name}</td>
                                    <td className="p-2 text-center">{item.quantity}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                                    <td className="p-2 text-right font-bold">{formatCurrency(item.total_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Warranty Terms Section */}
                {company?.warranty_terms && (
                    <div className="border border-black rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-start bg-gray-100 -mt-[26px] mb-2 px-2 inline-block">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-black">Termos de Garantia e Aceite</h2>
                        </div>
                        <div className="text-[10px] leading-relaxed text-gray-700 whitespace-pre-line mb-4">
                            {company.warranty_terms}
                        </div>
                        {os.terms_accepted && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                O CLIENTE DECLARA ESTAR CIENTE E DE ACORDO COM OS TERMOS ACIMA DESCRITOS.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-between items-start mt-8">
                    <div className="w-1/2 pt-12 text-black">
                        <div className="border-t border-black text-center pt-1 w-64 text-sm font-bold">Assinatura do Cliente</div>
                    </div>
                    <div className="bg-gray-100 p-4 border border-black rounded w-72">
                        <div className="flex justify-between font-black text-xl border-t-2 border-black pt-2">
                            <span>TOTAL:</span>
                            <span>{formatCurrency(os.final_cost || os.estimated_cost)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
