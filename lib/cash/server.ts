import 'server-only'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cash register rules shared by the API routes: which register a movement
 * goes to (each operator can have their own), the store's cash settings
 * (card fees, withdrawal limit, owner PIN, closing report) and the closing
 * numbers.
 */

export const MANAGER_ROLES = ['admin', 'owner', 'manager']
export const OWNER_ROLES = ['admin', 'owner']

export const isManager = (role?: string | null) => MANAGER_ROLES.includes(role ?? '')
export const isOwner = (role?: string | null) => OWNER_ROLES.includes(role ?? '')

/**
 * Register for a movement made by this user: their own open register, else
 * the store's most recently opened one (so a sale at the counter still lands
 * somewhere when only the owner opened a register).
 */
export async function findOpenRegister(db: SupabaseClient, companyId: string, userId?: string | null) {
    const { data } = await db
        .from('cash_registers')
        .select('id, user_id, opened_at')
        .eq('company_id', companyId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(20)
    const list = data ?? []
    return (userId && list.find(r => r.user_id === userId)) || list[0] || null
}

/* ───────────────────────────── Settings ───────────────────────────── */

export interface FeeRule { rate: number; days: number }
export interface CashSettings {
    fees: { debit: FeeRule; credit: FeeRule; credit_installments: FeeRule; pix: FeeRule }
    /** Withdrawals above this need the owner's PIN (0 = no limit). */
    sangria_limit: number
    /** Send the closing report on WhatsApp to this number. */
    report_phone: string | null
    /** Discounts above this % of the sale need the owner's PIN (0 = no limit). */
    max_discount_pct: number
    pin_hash: string | null
}

export const DEFAULT_CASH_SETTINGS: CashSettings = {
    fees: {
        debit: { rate: 0, days: 1 },
        credit: { rate: 0, days: 30 },
        credit_installments: { rate: 0, days: 30 },
        pix: { rate: 0, days: 0 },
    },
    sangria_limit: 0,
    report_phone: null,
    max_discount_pct: 0,
    pin_hash: null,
}

function clampRule(r: Partial<FeeRule> | undefined, d: FeeRule): FeeRule {
    const rate = Math.min(Math.max(Number(r?.rate ?? d.rate) || 0, 0), 30)
    const days = Math.min(Math.max(Math.round(Number(r?.days ?? d.days) || 0), 0), 120)
    return { rate, days }
}

export function normalizeCashSettings(raw: unknown): CashSettings {
    const r = (raw ?? {}) as Partial<CashSettings>
    const d = DEFAULT_CASH_SETTINGS
    return {
        fees: {
            debit: clampRule(r.fees?.debit, d.fees.debit),
            credit: clampRule(r.fees?.credit, d.fees.credit),
            credit_installments: clampRule(r.fees?.credit_installments, d.fees.credit_installments),
            pix: clampRule(r.fees?.pix, d.fees.pix),
        },
        sangria_limit: Math.max(Number(r.sangria_limit) || 0, 0),
        report_phone: typeof r.report_phone === 'string' && r.report_phone.replace(/\D/g, '').length >= 10 ? r.report_phone : null,
        max_discount_pct: Math.min(Math.max(Number(r.max_discount_pct) || 0, 0), 100),
        pin_hash: typeof r.pin_hash === 'string' ? r.pin_hash : null,
    }
}

export async function loadCashSettings(db: SupabaseClient, companyId: string) {
    const { data } = await db.from('companies').select('settings').eq('id', companyId).single()
    const settings = (data?.settings ?? {}) as Record<string, unknown>
    return { all: settings, cash: normalizeCashSettings(settings.cash) }
}

export async function saveCashSettings(db: SupabaseClient, companyId: string, cash: CashSettings) {
    const { all } = await loadCashSettings(db, companyId)
    const { error } = await db.from('companies').update({ settings: { ...all, cash } }).eq('id', companyId)
    if (error) throw error
}

/** What any user of the store may see (never the PIN hash). */
export function publicCashSettings(s: CashSettings, withPhone: boolean) {
    return { fees: s.fees, sangria_limit: s.sangria_limit, max_discount_pct: s.max_discount_pct, has_pin: !!s.pin_hash, report_phone: withPhone ? s.report_phone : null }
}

export function hashPin(pin: string) {
    const salt = randomBytes(16).toString('hex')
    return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`
}

export function verifyPin(pin: string, stored: string | null) {
    if (!stored || !pin) return false
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const got = scryptSync(pin, salt, 32)
    const want = Buffer.from(hash, 'hex')
    return got.length === want.length && timingSafeEqual(got, want)
}

/* ─────────────────────────── Closing numbers ─────────────────────────── */

type Tx = { type: string; amount: unknown; source_type?: string | null; payment_methods?: { code?: string | null; name?: string | null } | { code?: string | null; name?: string | null }[] | null }

const n = (v: unknown) => Number(v) || 0
function method(tx: Tx) {
    const m = Array.isArray(tx.payment_methods) ? tx.payment_methods[0] : tx.payment_methods
    return { code: (m?.code ?? '').toUpperCase(), name: (m?.name ?? '').toLowerCase() }
}
export function groupOf(tx: Tx): 'cash' | 'pix' | 'debit' | 'credit' | 'other' {
    const { code, name } = method(tx)
    if (code === 'CASH' || name.includes('dinheiro')) return 'cash'
    if (code === 'PIX' || name.includes('pix')) return 'pix'
    if (code === 'DEBIT_CARD' || name.includes('débito') || name.includes('debito')) return 'debit'
    if (code === 'CREDIT_CARD' || name.includes('crédito') || name.includes('credito')) return 'credit'
    return 'other'
}
const isCost = (tx: Tx) => tx.type === 'exit' && (tx.source_type === 'service_order' || tx.source_type === 'product_sale' || tx.source_type === 'device_sale')
const isSale = (tx: Tx) => tx.type === 'entry' && ['service_order', 'product_sale', 'receivable', 'device_sale'].includes(tx.source_type ?? '')

export function feeOf(group: string, amount: number, s: CashSettings) {
    const rule = group === 'debit' ? s.fees.debit : group === 'credit' ? s.fees.credit : group === 'pix' ? s.fees.pix : null
    return rule ? { fee: Math.round(amount * rule.rate) / 100, days: rule.days } : { fee: 0, days: 0 }
}

export function closingNumbers(opening: number, txs: Tx[], s: CashSettings) {
    let entries = 0, exits = 0, withdrawals = 0, supplies = 0, expenses = 0, refunds = 0, cash = opening, fees = 0
    const byMethod: Record<string, number> = { cash: 0, pix: 0, debit: 0, credit: 0, other: 0 }
    let sales = 0
    for (const tx of txs) {
        const a = n(tx.amount)
        const g = groupOf(tx)
        if (tx.type === 'entry') {
            entries += a
            if (g === 'cash') cash += a
            if (isSale(tx)) { byMethod[g] += a; sales++; fees += feeOf(g, a, s).fee }
            if (tx.source_type === 'manual_suprimento') supplies += a
        } else {
            exits += a
            if (g === 'cash' && !isCost(tx)) cash -= a
            if (tx.source_type === 'manual_sangria') withdrawals += a
            else if (tx.source_type === 'refund') refunds += a
            else if (!isCost(tx)) expenses += a
        }
    }
    const received = Object.values(byMethod).reduce((x, y) => x + y, 0)
    return { opening, entries, exits, balance: opening + entries - exits, expectedCash: cash, byMethod, received, sales, withdrawals, supplies, expenses, refunds, fees }
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
