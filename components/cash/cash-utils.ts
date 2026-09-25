/** Shared helpers for the cash register screens. */

export interface CashTx {
    id: string
    cash_register_id: string
    type: 'entry' | 'exit'
    amount: number | string
    description?: string | null
    source_type?: string | null
    source_id?: string | null
    created_at: string
    user_id?: string
    justification?: string | null
    payment_methods?: { name?: string; code?: string } | null
    service_orders?: { parts_cost?: number | string } | null
    sales?: { total_cost?: number | string } | null
    [key: string]: unknown
}

export type MethodGroup = 'cash' | 'pix' | 'debit' | 'credit' | 'other'

export const METHOD_GROUPS: { key: MethodGroup; label: string }[] = [
    { key: 'cash', label: 'Dinheiro' },
    { key: 'pix', label: 'Pix' },
    { key: 'debit', label: 'Débito' },
    { key: 'credit', label: 'Crédito' },
    { key: 'other', label: 'Outros' },
]

export function methodGroup(tx: CashTx): MethodGroup {
    const code = (tx.payment_methods?.code || '').toUpperCase()
    const name = (tx.payment_methods?.name || '').toLowerCase()
    if (code === 'CASH' || name.includes('dinheiro')) return 'cash'
    if (code === 'PIX' || name.includes('pix')) return 'pix'
    if (code === 'DEBIT_CARD' || name.includes('débito') || name.includes('debito')) return 'debit'
    if (code === 'CREDIT_CARD' || name.includes('crédito') || name.includes('credito')) return 'credit'
    return 'other'
}

/** Store's cash settings as the app sees them. */
export interface FeeRule { rate: number; days: number }
export interface CashSettingsView {
    fees: { debit: FeeRule; credit: FeeRule; credit_installments: FeeRule; pix: FeeRule }
    sangria_limit: number
    max_discount_pct: number
    has_pin: boolean
    report_phone: string | null
    can_edit: boolean
    whatsapp_ready: boolean
}

export function feeRule(group: MethodGroup, s: CashSettingsView | null): FeeRule | null {
    if (!s) return null
    return group === 'debit' ? s.fees.debit : group === 'credit' ? s.fees.credit : group === 'pix' ? s.fees.pix : null
}

export function methodName(tx: CashTx) {
    return tx.payment_methods?.name || 'Sem forma'
}

/** Automatic cost records (parts/products cost) are bookkeeping, not money leaving the drawer. */
export function isCostRecord(tx: CashTx) {
    return tx.type === 'exit' && (tx.source_type === 'service_order' || tx.source_type === 'product_sale')
}

export function sourceLabel(tx: CashTx) {
    switch (tx.source_type) {
        case 'service_order': return tx.type === 'exit' ? 'Custo de peças' : 'Ordem de serviço'
        case 'product_sale': return tx.type === 'exit' ? 'Custo de produtos' : 'Venda'
        case 'manual_suprimento': return 'Suprimento'
        case 'manual_sangria': return 'Sangria'
        case 'recurring_expense': return 'Conta fixa'
        case 'payment': return 'Pagamento'
        case 'bill': return 'Conta paga'
        case 'refund': return 'Devolução'
        case 'device_sale': return 'Venda de aparelho'
        case 'device_purchase': return 'Compra de aparelho'
        case 'receivable': return 'Recebimento'
        default: return tx.type === 'entry' ? 'Entrada' : 'Saída'
    }
}

/** "Sangria: troco" → "troco"; keeps other descriptions as they are. */
export function cleanDescription(tx: CashTx) {
    const raw = (tx.description || '').trim()
    const short = (id: string) => `#${id.slice(0, 4).toUpperCase()}`
    let m: RegExpMatchArray | null
    if ((m = raw.match(/^Venda PDV - ID:\s*(\w+)/i))) return `Venda ${short(m[1])}`
    if ((m = raw.match(/^Custo Produtos - Venda ID:\s*(\w+)/i))) return `Custo dos produtos · venda ${short(m[1])}`
    if ((m = raw.match(/^Custo de Peças OS #?(.+)$/i))) return `Custo das peças · OS ${m[1]}`
    if ((m = raw.match(/^Pagamento OS #?(.+)$/i))) return `OS ${m[1]}`
    if ((m = raw.match(/^\[Fixa\]\s*(.+)$/))) return m[1]
    if ((m = raw.match(/^Conta paga:\s*(.+)$/))) return m[1]
    const d = raw.replace(/^(Suprimento|Sangria|Recebimento):\s*/i, '').trim()
    if (!d || d === 'Manual') return sourceLabel(tx)
    return d
}

/** Short method name for list rows ("Cartão de Crédito" → "Crédito"). */
export function methodShort(tx: CashTx) {
    const n = methodName(tx)
    return n.replace(/^Cartão de /i, '')
}

export function num(v: unknown) {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

/** Money in the drawer: opening + cash entries − cash that actually left. */
export function drawerCash(opening: number, txs: CashTx[]) {
    return txs.reduce((sum, tx) => {
        if (methodGroup(tx) !== 'cash' || isCostRecord(tx)) return sum
        return sum + (tx.type === 'entry' ? num(tx.amount) : -num(tx.amount))
    }, opening)
}

export function timeOf(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function dayLabel(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const y = new Date(); y.setDate(today.getDate() - 1)
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
    if (same(d, today)) return 'Hoje'
    if (same(d, y)) return 'Ontem'
    const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    return s.charAt(0).toUpperCase() + s.slice(1)
}
