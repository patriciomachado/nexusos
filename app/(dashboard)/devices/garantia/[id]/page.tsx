import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import PrintButton from '@/app/(dashboard)/pdv/recibo/[id]/PrintButton'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const day = (d?: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR') : '—')

/** Warranty certificate for a sold device, to print or save as PDF. */
export default async function WarrantyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) redirect('/dashboard')
    const [{ data: d }, { data: company }] = await Promise.all([
        db.from('devices').select('*, customers:sold_customer_id(name, cpf_cnpj, phone)').eq('id', id).eq('company_id', user.company_id).maybeSingle(),
        db.from('companies').select('name, cnpj, phone, address, city, state, logo_url, warranty_terms').eq('id', user.company_id).single(),
    ])
    if (!d) notFound()
    const customer = Array.isArray(d.customers) ? d.customers[0] : d.customers
    const title = [d.brand, d.model, d.storage].filter(Boolean).join(' ')
    const where = [company?.address, company?.city, company?.state].filter(Boolean).join(', ')

    return (
        <div className="min-h-full bg-background px-4 py-4">
            <div className="no-print max-w-2xl mx-auto flex items-center justify-between mb-3">
                <Link href="/devices?aba=vendidos" className="inline-flex items-center text-[15px] text-primary"><ChevronLeft className="w-4 h-4" /> Aparelhos</Link>
                <PrintButton />
            </div>
            <div className="print-report max-w-2xl mx-auto rounded-2xl bg-white text-black p-8 text-[14px] leading-relaxed shadow-sm space-y-5">
                <header className="flex items-center gap-4 border-b border-black/10 pb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {company?.logo_url && <img width={56} height={56} src={company.logo_url} alt="" className="h-14 w-14 object-contain" />}
                    <div>
                        <p className="text-[18px] font-bold">{company?.name}</p>
                        <p className="text-[12px] text-black/60">{[company?.cnpj ? `CNPJ ${company.cnpj}` : null, where, company?.phone].filter(Boolean).join(' · ')}</p>
                    </div>
                </header>
                <h1 className="text-[22px] font-bold">Termo de garantia</h1>
                <table className="w-full text-[14px]">
                    <tbody>
                        <tr><td className="py-1 text-black/60 w-44">Aparelho</td><td className="py-1 font-medium">{title}{d.color ? ` · ${d.color}` : ''}</td></tr>
                        {d.imei_1 && <tr><td className="py-1 text-black/60">IMEI</td><td className="py-1">{d.imei_1}{d.imei_2 ? ` / ${d.imei_2}` : ''}</td></tr>}
                        {d.battery_health ? <tr><td className="py-1 text-black/60">Bateria na venda</td><td className="py-1">{d.battery_health}%</td></tr> : null}
                        <tr><td className="py-1 text-black/60">Cliente</td><td className="py-1">{customer?.name ?? '—'}{customer?.cpf_cnpj ? ` · ${customer.cpf_cnpj}` : ''}</td></tr>
                        <tr><td className="py-1 text-black/60">Data da venda</td><td className="py-1">{day(d.sold_at)}</td></tr>
                        <tr><td className="py-1 text-black/60">Valor</td><td className="py-1">{brl(Number(d.sold_price || d.cash_price || 0))}</td></tr>
                        <tr><td className="py-1 text-black/60">Garantia</td><td className="py-1 font-semibold">{d.warranty_months ?? 0} meses · válida até {day(d.warranty_until)}</td></tr>
                    </tbody>
                </table>
                <section>
                    <h2 className="font-semibold mb-1">Condições</h2>
                    <p className="whitespace-pre-line text-[13px]">
                        {company?.warranty_terms || 'A garantia cobre defeitos de funcionamento do aparelho no período acima. Não cobre quedas, contato com líquidos, tela ou vidro quebrados, mau uso, oxidação ou aparelho aberto por terceiros. Para acionar, traga o aparelho com este termo.'}
                    </p>
                </section>
                <div className="grid grid-cols-2 gap-10 pt-10 text-center text-[12px]">
                    <div className="border-t border-black/40 pt-1">{company?.name}</div>
                    <div className="border-t border-black/40 pt-1">{customer?.name ?? 'Cliente'}</div>
                </div>
            </div>
        </div>
    )
}
