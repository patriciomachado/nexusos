/**
 * Service pricing: what an hour of bench work costs the store, and the
 * price that covers parts, that time, taxes, card fees and the margin.
 * Pure functions, shared by the settings page, the OS calculator and the API.
 */

export interface PricingSettings {
    /** Fixed monthly costs typed by hand; null = use the monthly bills in Contas. */
    fixed_costs: number | null
    /** Pro-labore and salaries not registered in Contas. */
    extra_costs: number
    hours_per_month: number
    /** Share of the hours actually spent on repairs (the rest is attending, buying, cleaning…). */
    productive_pct: number
    margin_pct: number
    tax_pct: number
}

export const DEFAULT_PRICING: PricingSettings = {
    fixed_costs: null,
    extra_costs: 0,
    hours_per_month: 176, // 8 h × 22 days
    productive_pct: 70,
    margin_pct: 40,
    tax_pct: 6,
}

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
    const v = Number(n)
    return Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback
}

export function normalizePricing(raw: unknown): PricingSettings {
    const r = (raw ?? {}) as Partial<PricingSettings>
    return {
        fixed_costs: r.fixed_costs == null || (r.fixed_costs as unknown) === '' ? null : clamp(r.fixed_costs, 0, 10_000_000, 0),
        extra_costs: clamp(r.extra_costs, 0, 10_000_000, 0),
        hours_per_month: clamp(r.hours_per_month, 1, 744, DEFAULT_PRICING.hours_per_month),
        productive_pct: clamp(r.productive_pct, 10, 100, DEFAULT_PRICING.productive_pct),
        margin_pct: clamp(r.margin_pct, 0, 80, DEFAULT_PRICING.margin_pct),
        tax_pct: clamp(r.tax_pct, 0, 40, DEFAULT_PRICING.tax_pct),
    }
}

/** What one hour of repair work costs, given the month's fixed costs. */
export function hourCost(s: PricingSettings, billsTotal: number) {
    const fixed = (s.fixed_costs ?? billsTotal) + s.extra_costs
    const hours = s.hours_per_month * (s.productive_pct / 100)
    return hours > 0 ? fixed / hours : 0
}

export interface Fees { credit: number; installments: number }

export interface Quote {
    partsCost: number
    laborCost: number
    cost: number
    /** Below this the store loses money (covers cost, taxes and the card fee). */
    minimum: number
    /** Pix or cash. */
    suggested: number
    credit: number
    installments: number
    profit: number
}

/** Price whose taxes, card fee and margin (all % of the price) leave `cost` covered. */
function priceFor(cost: number, pctOfPrice: number) {
    const keep = 1 - Math.min(pctOfPrice, 90) / 100
    return cost / keep
}

/** Rounds up to a price that reads well: R$ 5 steps under R$ 200, R$ 10 above. */
export function nicePrice(n: number) {
    if (n <= 0) return 0
    const step = n < 200 ? 5 : 10
    return Math.ceil(n / step) * step
}

export function quote(input: { partsCost: number; minutes: number; hourCost: number; marginPct: number; taxPct: number; fees: Fees }): Quote {
    const partsCost = Math.max(0, input.partsCost)
    const laborCost = Math.max(0, input.minutes) / 60 * Math.max(0, input.hourCost)
    const cost = partsCost + laborCost
    const suggested = nicePrice(priceFor(cost, input.taxPct + input.marginPct))
    const minimum = Math.ceil(priceFor(cost, input.taxPct))
    // Card prices keep the same net as the Pix price after the machine's fee.
    const credit = nicePrice(suggested / (1 - Math.min(input.fees.credit, 50) / 100))
    const installments = nicePrice(suggested / (1 - Math.min(input.fees.installments, 50) / 100))
    const profit = suggested * (1 - input.taxPct / 100) - cost
    return { partsCost, laborCost, cost, minimum, suggested, credit, installments, profit }
}

/** Profit share of a chosen price, after cost and taxes. */
export function marginAt(price: number, cost: number, taxPct: number) {
    if (price <= 0) return null
    return (price * (1 - taxPct / 100) - cost) / price
}

/** Colors a margin: red under 10%, amber under the target, green at or above it. */
export function marginTone(m: number | null, target: number) {
    if (m == null) return 'text-muted-foreground'
    if (m < 0.1) return 'text-red-600 dark:text-red-400'
    if (m * 100 < target - 0.5) return 'text-amber-600 dark:text-amber-400'
    return 'text-emerald-600 dark:text-emerald-400'
}

export interface ServiceRow {
    id: string
    name: string
    description: string | null
    /** Bench time; null until the 20261003 migration runs. */
    minutes: number | null
    price: number
}

/** What GET /api/pricing returns. */
export interface PricingData {
    settings: PricingSettings
    bills: { total: number; count: number }
    hourCost: number
    fees: Fees
    services: ServiceRow[]
}
