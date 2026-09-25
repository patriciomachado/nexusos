import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readDocuments } from '@/lib/settings/documents'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const METHOD: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'Pix', cartao_debito: 'Débito', cartao_credito: 'Crédito', crediario: 'Crediário', transferencia: 'Transferência', devolucao: 'Devolução' }

/** Everything a sale receipt shows, for the printed page and WhatsApp. */
export async function loadReceipt(db: SupabaseClient, companyId: string, saleId: string) {
    const [{ data: sale }, { data: company }, { data: payments }] = await Promise.all([
        db.from('sales').select('*, customers(name, phone), users(full_name), sale_items(*)').eq('id', saleId).eq('company_id', companyId).maybeSingle(),
        db.from('companies').select('name, cnpj, phone, address, city, state, logo_url, warranty_terms, settings').eq('id', companyId).single(),
        db.from('payments').select('amount, payment_method, installments, notes').eq('sale_id', saleId).eq('company_id', companyId),
    ])
    if (!sale) return null
    const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers
    const items = (sale.sale_items ?? []) as { item_name: string; quantity: number; unit_price: number; total_price: number; returned_quantity?: number }[]
    const pays = (payments ?? []).filter(p => Number(p.amount) > 0).map(p => ({ label: METHOD[p.payment_method as string] ?? String(p.payment_method), amount: Number(p.amount), installments: Number(p.installments) || 1 }))
    const code = `#${String(sale.id).slice(0, 4).toUpperCase()}`
    const doc = readDocuments(company?.settings)
    const receiptFooter = doc.receipt_footer || null

    const text = [
        `*${company?.name ?? 'Loja'}* · Recibo da venda ${code}`,
        new Date(sale.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }),
        '',
        ...items.map(i => `${Number(i.quantity)}× ${i.item_name} — ${brl(Number(i.total_price))}`),
        Number(sale.discount_amount) > 0 ? `Desconto: −${brl(Number(sale.discount_amount))}` : null,
        `*Total: ${brl(Number(sale.final_amount ?? sale.total_amount))}*`,
        pays.filter(p => p.amount > 0).map(p => `${p.label}${p.installments > 1 ? ` ${p.installments}x` : ''}: ${brl(p.amount)}`).join(' · ') || null,
        '',
        receiptFooter || 'Obrigado pela preferência!',
    ].filter((l): l is string => l !== null).join('\n')

    return { sale, company, customer, items, payments: pays, code, text, footer: receiptFooter, doc }
}
