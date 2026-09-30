import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import { loadReceipt } from '@/lib/pdv/receipt'
import PrintButton from './PrintButton'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Sale receipt sized for a thermal printer (80mm) or a PDF. */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) redirect('/dashboard')
    const r = await loadReceipt(db, user.company_id, id).catch(() => null)
    if (!r) notFound()
    const { sale, company, customer, items, payments } = r
    const where = [company?.address, company?.city, company?.state].filter(Boolean).join(', ')

    return (
        <div className="min-h-full bg-background px-4 py-4">
            <div className="no-print max-w-[380px] mx-auto flex items-center justify-between mb-3">
                <Link href="/pdv" className="inline-flex items-center text-[15px] text-primary"><ChevronLeft className="w-4 h-4" /> Vender</Link>
                <PrintButton />
            </div>
            <div className="print-report receipt max-w-[380px] mx-auto rounded-2xl bg-white text-black p-5 font-mono text-[13px] leading-relaxed shadow-sm">
                <div className="text-center">
                    {r.doc.show_logo && company?.logo_url && <img src={company.logo_url} alt="" className="h-12 mx-auto mb-1 object-contain" />}
                    <p className="font-bold text-[15px]">{company?.name}</p>
                    {r.doc.tagline && <p>{r.doc.tagline}</p>}
                    {company?.cnpj && <p>CNPJ {company.cnpj}</p>}
                    {where && <p>{where}</p>}
                    {company?.phone && <p>{company.phone}</p>}
                </div>
                <hr className="my-3 border-dashed border-black/40" />
                <p>Venda {r.code} · {new Date(sale.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}</p>
                {customer?.name && <p>Cliente: {customer.name}</p>}
                <p className="text-[11px]">NÃO É DOCUMENTO FISCAL</p>
                <hr className="my-3 border-dashed border-black/40" />
                {items.map((i, k) => (
                    <div key={k} className="mb-1">
                        <p>{i.item_name}</p>
                        <p className="flex justify-between"><span>{Number(i.quantity)} × {brl(Number(i.unit_price))}{Number(i.returned_quantity) > 0 ? ` (devolvido ${Number(i.returned_quantity)})` : ''}</span><span>{brl(Number(i.total_price))}</span></p>
                    </div>
                ))}
                <hr className="my-3 border-dashed border-black/40" />
                {Number(sale.discount_amount) > 0 && <p className="flex justify-between"><span>Desconto</span><span>−{brl(Number(sale.discount_amount))}</span></p>}
                <p className="flex justify-between font-bold text-[15px]"><span>TOTAL</span><span>{brl(Number(sale.final_amount ?? sale.total_amount))}</span></p>
                {payments.map((p, k) => (
                    <p key={k} className="flex justify-between"><span>{p.label}{p.installments > 1 ? ` ${p.installments}x` : ''}</span><span>{brl(p.amount)}</span></p>
                ))}
                <hr className="my-3 border-dashed border-black/40" />
                <p className="text-center whitespace-pre-line">{r.footer || 'Obrigado pela preferência!'}</p>
            </div>
        </div>
    )
}
