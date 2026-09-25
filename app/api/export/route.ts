import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'
import { rateLimit } from '@/lib/security-rate-limit'
import { toCsv, dateOnly, dateTime, type Column } from '@/lib/export/csv'
import { statusMeta } from '@/lib/os/status'

type Row = Record<string, unknown>
type Page = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>

const PAGE = 1000
const CAP = 100_000

/** Reads every row in pages (PostgREST returns at most 1000 at a time). */
async function fetchAll(make: (from: number, to: number) => Page): Promise<Row[]> {
    const out: Row[] = []
    for (let from = 0; from < CAP; from += PAGE) {
        const { data, error } = await make(from, from + PAGE - 1)
        if (error) throw new Error(error.message)
        out.push(...((data ?? []) as Row[]))
        if (!data || data.length < PAGE) break
    }
    return out
}

async function fetchByIds(db: SupabaseClient, table: string, column: string, ids: string[], select = '*') {
    const out: Row[] = []
    for (let i = 0; i < ids.length; i += 200) {
        out.push(...await fetchAll((a, b) => db.from(table).select(select).in(column, ids.slice(i, i + 200)).order('id').range(a, b)))
    }
    return out
}

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Row | undefined
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
const METHOD: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'Pix', cartao_debito: 'Débito', cartao_credito: 'Crédito', crediario: 'Crediário', transferencia: 'Transferência', boleto: 'Boleto' }
const SOURCE: Record<string, string> = { service_order: 'OS', product_sale: 'Venda', device_sale: 'Venda de aparelho', device_purchase: 'Compra de aparelho', manual_sangria: 'Sangria', manual_suprimento: 'Suprimento', recurring_expense: 'Conta fixa', bill: 'Conta paga', receivable: 'Recebimento de fiado', refund: 'Devolução', manual: 'Lançamento manual' }
const CONDITION: Record<string, string> = { novo_lacrado: 'Novo lacrado', seminovo_a: 'Seminovo A', seminovo_b: 'Seminovo B', recondicionado: 'Recondicionado' }
const DEVICE_STATUS: Record<string, string> = { disponivel: 'Disponível', reservado: 'Reservado', em_revisao: 'Em revisão', vendido: 'Vendido' }
const PAY_STATUS: Record<string, string> = { completed: 'Pago', pending: 'A receber', cancelled: 'Cancelado', refunded: 'Estornado', failed: 'Falhou', partial: 'Parcial' }

const KINDS = ['clientes', 'os', 'vendas', 'estoque', 'aparelhos', 'financeiro', 'caixa', 'contas', 'backup'] as const
type Kind = typeof KINDS[number]

/**
 * Spreadsheet export (CSV) of one area, or a full JSON backup for the owner.
 * ?kind=clientes|os|vendas|estoque|aparelhos|financeiro|caixa|contas|backup
 * &from=YYYY-MM-DD&to=YYYY-MM-DD (dated areas only)
 */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId, role, userId } = ctx
    const url = new URL(req.url)
    const kind = url.searchParams.get('kind') as Kind
    if (!KINDS.includes(kind)) return NextResponse.json({ error: 'Tipo de exportação inválido' }, { status: 400 })
    if (kind === 'backup' ? !isOwner(role) : !isManager(role)) return forbiddenResponse()
    if (!rateLimit('export', 20, 10 * 60 * 1000, userId)) return NextResponse.json({ error: 'Muitas exportações seguidas. Tente de novo em alguns minutos.' }, { status: 429 })

    const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)
    const fromDay = day(url.searchParams.get('from'))
    const toDay = day(url.searchParams.get('to'))
    const from = fromDay ? new Date(`${fromDay}T00:00:00-03:00`).toISOString() : null
    const to = toDay ? new Date(new Date(`${toDay}T00:00:00-03:00`).getTime() + 86_400_000).toISOString() : null
    // Adds the period filter to a query on a timestamp column.
    const dated = <Q extends { gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q }>(q: Q, col: string) => {
        let r = q
        if (from) r = r.gte(col, from)
        if (to) r = r.lt(col, to)
        return r
    }
    const stamp = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

    try {
        if (kind === 'backup') return await backup(db, companyId, stamp)

        let csv = ''
        if (kind === 'clientes') {
            const rows = await fetchAll((a, b) => db.from('customers').select('name, phone, email, cpf_cnpj, address, city, state, zip_code, birth_date, tags, notes, is_active, created_at').eq('company_id', companyId).order('name').range(a, b))
            csv = toCsv(rows, [
                { label: 'Nome', value: r => r.name as string },
                { label: 'WhatsApp', value: r => r.phone as string },
                { label: 'E-mail', value: r => r.email as string },
                { label: 'CPF/CNPJ', value: r => r.cpf_cnpj as string },
                { label: 'Endereço', value: r => r.address as string },
                { label: 'Cidade', value: r => r.city as string },
                { label: 'UF', value: r => r.state as string },
                { label: 'CEP', value: r => r.zip_code as string },
                { label: 'Aniversário', value: r => dateOnly(r.birth_date) },
                { label: 'Etiquetas', value: r => (Array.isArray(r.tags) ? (r.tags as string[]).join(', ') : '') },
                { label: 'Observações', value: r => r.notes as string },
                { label: 'Ativo', value: r => r.is_active !== false },
                { label: 'Cadastro', value: r => dateTime(r.created_at) },
            ])
        } else if (kind === 'os') {
            const rows = await fetchAll((a, b) => dated(db.from('service_orders').select('order_number, status, title, equipment_serial, problem_description, solution_applied, labor_cost, parts_cost, discount_amount, estimated_cost, final_cost, warranty_months, created_at, completed_at, customers(name, phone), technicians(name)').eq('company_id', companyId), 'created_at').order('created_at', { ascending: false }).range(a, b))
            csv = toCsv(rows, [
                { label: 'Nº OS', value: r => r.order_number as string },
                { label: 'Situação', value: r => statusMeta(r.status as string).label },
                { label: 'Cliente', value: r => one(r.customers)?.name as string },
                { label: 'Telefone', value: r => one(r.customers)?.phone as string },
                { label: 'Aparelho', value: r => r.title as string },
                { label: 'IMEI/Série', value: r => r.equipment_serial as string },
                { label: 'Defeito', value: r => r.problem_description as string },
                { label: 'Solução', value: r => r.solution_applied as string },
                { label: 'Técnico', value: r => one(r.technicians)?.name as string },
                { label: 'Mão de obra', value: r => num(r.labor_cost) },
                { label: 'Peças', value: r => num(r.parts_cost) },
                { label: 'Desconto', value: r => num(r.discount_amount) },
                { label: 'Total', value: r => num(r.final_cost) || num(r.estimated_cost) },
                { label: 'Garantia (meses)', value: r => num(r.warranty_months) },
                { label: 'Entrada', value: r => dateTime(r.created_at) },
                { label: 'Conclusão', value: r => dateTime(r.completed_at) },
            ])
        } else if (kind === 'vendas') {
            const rows = await fetchAll((a, b) => dated(db.from('sales').select('id, created_at, status, total_amount, discount_amount, final_amount, total_cost, customers(name), users(full_name), sale_items(item_name, quantity, returned_quantity)').eq('company_id', companyId), 'created_at').order('created_at', { ascending: false }).range(a, b))
            csv = toCsv(rows, [
                { label: 'Data', value: r => dateTime(r.created_at) },
                { label: 'Venda', value: r => `#${String(r.id).slice(0, 4).toUpperCase()}` },
                { label: 'Cliente', value: r => one(r.customers)?.name as string },
                { label: 'Vendedor', value: r => one(r.users)?.full_name as string },
                { label: 'Itens', value: r => ((r.sale_items as Row[] | null) ?? []).map(i => `${i.quantity}x ${i.item_name}${Number(i.returned_quantity) > 0 ? ` (devolvido ${i.returned_quantity})` : ''}`).join(' | ') },
                { label: 'Subtotal', value: r => num(r.total_amount) },
                { label: 'Desconto', value: r => num(r.discount_amount) },
                { label: 'Total', value: r => num(r.final_amount) },
                { label: 'Custo', value: r => num(r.total_cost) },
                { label: 'Situação', value: r => (['cancelled', 'cancelada'].includes(String(r.status)) ? 'Cancelada' : 'Concluída') },
            ])
        } else if (kind === 'estoque') {
            const rows = await fetchAll((a, b) => db.from('inventory_items').select('name, sku, barcode, category, cost_price, selling_price, quantity_in_stock, minimum_quantity, unit, is_active').eq('company_id', companyId).order('name').range(a, b))
            csv = toCsv(rows, [
                { label: 'Produto', value: r => r.name as string },
                { label: 'SKU', value: r => r.sku as string },
                { label: 'Código de barras', value: r => r.barcode as string },
                { label: 'Categoria', value: r => r.category as string },
                { label: 'Custo', value: r => num(r.cost_price) },
                { label: 'Preço', value: r => num(r.selling_price) },
                { label: 'Em estoque', value: r => num(r.quantity_in_stock) },
                { label: 'Mínimo', value: r => num(r.minimum_quantity) },
                { label: 'Unidade', value: r => r.unit as string },
                { label: 'Ativo', value: r => r.is_active !== false },
            ])
        } else if (kind === 'aparelhos') {
            const rows = await fetchAll((a, b) => db.from('devices').select('brand, model, storage, color, condition, battery_health, imei_1, serial_number, cost_price, extra_costs, cash_price, installment_price, status, created_at, sold_at, sold_price, warranty_until').eq('company_id', companyId).order('created_at', { ascending: false }).range(a, b))
            const extras = (r: Row) => (Array.isArray(r.extra_costs) ? (r.extra_costs as Row[]).reduce((s, c) => s + (Number(c.amount) || 0), 0) : 0)
            csv = toCsv(rows, [
                { label: 'Marca', value: r => r.brand as string },
                { label: 'Modelo', value: r => r.model as string },
                { label: 'Armazenamento', value: r => r.storage as string },
                { label: 'Cor', value: r => r.color as string },
                { label: 'Condição', value: r => CONDITION[r.condition as string] ?? (r.condition as string) },
                { label: 'Bateria (%)', value: r => num(r.battery_health) },
                { label: 'IMEI', value: r => r.imei_1 as string },
                { label: 'Série', value: r => r.serial_number as string },
                { label: 'Custo', value: r => num(r.cost_price) },
                { label: 'Gastos extras', value: r => extras(r) },
                { label: 'Preço à vista', value: r => num(r.cash_price) },
                { label: 'Preço parcelado', value: r => num(r.installment_price) },
                { label: 'Situação', value: r => DEVICE_STATUS[r.status as string] ?? (r.status as string) },
                { label: 'Entrada', value: r => dateTime(r.created_at) },
                { label: 'Vendido em', value: r => dateTime(r.sold_at) },
                { label: 'Valor da venda', value: r => num(r.sold_price) },
                { label: 'Lucro', value: r => (r.sold_price != null ? Number(r.sold_price) - Number(r.cost_price || 0) - extras(r) : null) },
                { label: 'Garantia até', value: r => dateOnly(r.warranty_until) },
            ])
        } else if (kind === 'financeiro') {
            const rows = await fetchAll((a, b) => dated(db.from('payments').select('payment_date, due_date, amount, payment_method, payment_status, installments, notes, service_order_id, sale_id, customers(name)').eq('company_id', companyId), 'payment_date').order('payment_date', { ascending: false }).range(a, b))
            csv = toCsv(rows, [
                { label: 'Data', value: r => dateTime(r.payment_date) },
                { label: 'Vencimento', value: r => dateOnly(r.due_date) },
                { label: 'Valor', value: r => num(r.amount) },
                { label: 'Forma', value: r => METHOD[r.payment_method as string] ?? (r.payment_method as string) },
                { label: 'Parcelas', value: r => num(r.installments) },
                { label: 'Situação', value: r => PAY_STATUS[r.payment_status as string] ?? (r.payment_status as string) },
                { label: 'Origem', value: r => (r.service_order_id ? 'OS' : r.sale_id ? 'Venda' : 'Outro') },
                { label: 'Cliente', value: r => one(r.customers)?.name as string },
                { label: 'Observação', value: r => r.notes as string },
            ])
        } else if (kind === 'caixa') {
            const rows = await fetchAll((a, b) => dated(db.from('cash_transactions').select('created_at, type, amount, description, source_type, justification, users(full_name), payment_methods(name)').eq('company_id', companyId), 'created_at').order('created_at', { ascending: false }).range(a, b))
            csv = toCsv(rows, [
                { label: 'Data', value: r => dateTime(r.created_at) },
                { label: 'Tipo', value: r => (r.type === 'entry' ? 'Entrada' : 'Saída') },
                { label: 'Valor', value: r => num(r.amount) },
                { label: 'Descrição', value: r => r.description as string },
                { label: 'Forma', value: r => one(r.payment_methods)?.name as string },
                { label: 'Origem', value: r => SOURCE[r.source_type as string] ?? (r.source_type as string) },
                { label: 'Pessoa', value: r => one(r.users)?.full_name as string },
                { label: 'Justificativa', value: r => r.justification as string },
            ])
        } else if (kind === 'contas') {
            const rows = await fetchAll((a, b) => db.from('bills').select('description, amount, due_date, status, paid_at, paid_amount, paid_from, repeat_monthly, notes').eq('company_id', companyId).order('due_date', { ascending: false }).range(a, b))
            csv = toCsv(rows, [
                { label: 'Conta', value: r => r.description as string },
                { label: 'Valor', value: r => num(r.amount) },
                { label: 'Vencimento', value: r => dateOnly(r.due_date) },
                { label: 'Situação', value: r => (r.status === 'paid' ? 'Paga' : r.status === 'cancelled' ? 'Cancelada' : 'Em aberto') },
                { label: 'Paga em', value: r => dateTime(r.paid_at) },
                { label: 'Valor pago', value: r => num(r.paid_amount) },
                { label: 'Pago com', value: r => (r.paid_from === 'cash' ? 'Dinheiro do caixa' : r.paid_from ? 'Banco' : '') },
                { label: 'Todo mês', value: r => !!r.repeat_monthly },
                { label: 'Observação', value: r => r.notes as string },
            ] satisfies Column<Row>[])
        }

        const period = fromDay || toDay ? `_${fromDay ?? 'inicio'}_a_${toDay ?? 'hoje'}` : ''
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${kind}${period}_${stamp}.csv"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message || 'Não foi possível exportar' }, { status: 500 })
    }
}

/** Tables copied in the full backup. Credentials (WhatsApp tokens, push keys, logins) stay out. */
const BACKUP_TABLES = [
    'customers', 'customer_ratings', 'customer_messages', 'service_orders', 'service_types', 'technicians', 'appointments',
    'sales', 'inventory_items', 'product_categories', 'devices', 'device_trade_ins',
    'payments', 'payment_methods', 'cash_registers', 'cash_transactions', 'bills', 'recurring_expenses', 'applied_recurring_expenses',
    'tasks', 'task_routines', 'time_clock',
]

async function backup(db: SupabaseClient, companyId: string, stamp: string) {
    const data: Record<string, Row[]> = {}
    for (const t of BACKUP_TABLES) {
        data[t] = await fetchAll((a, b) => db.from(t).select('*').eq('company_id', companyId).order('id').range(a, b)).catch(() => [])
    }
    const osIds = data.service_orders.map(o => o.id as string)
    const saleIds = data.sales.map(s => s.id as string)
    data.service_order_items = await fetchByIds(db, 'service_order_items', 'service_order_id', osIds).catch(() => [])
    data.service_order_history = await fetchByIds(db, 'service_order_history', 'service_order_id', osIds).catch(() => [])
    data.sale_items = await fetchByIds(db, 'sale_items', 'sale_id', saleIds).catch(() => [])
    data.users = await fetchAll((a, b) => db.from('users').select('id, full_name, email, phone, role, is_active, created_at').eq('company_id', companyId).order('id').range(a, b)).catch(() => [])

    const { data: company } = await db.from('companies').select('*').eq('id', companyId).single()
    const settings = { ...((company?.settings ?? {}) as Row) }
    if (settings.cash && typeof settings.cash === 'object') settings.cash = { ...(settings.cash as Row), pin_hash: undefined }

    const body = JSON.stringify({
        format: 'nexus-backup',
        version: 1,
        exported_at: new Date().toISOString(),
        company: company ? { ...company, settings } : null,
        counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
        data,
    })
    return new NextResponse(body, {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="backup_${stamp}.json"`,
            'Cache-Control': 'no-store',
        },
    })
}
