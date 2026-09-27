import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getContext, forbiddenResponse, unauthorizedResponse } from '@/lib/security'
import { isManager } from '@/lib/cash/server'

export const PART_QUALITIES = ['original', 'premium', 'paralela', 'recondicionada', 'outra'] as const

/** Context for the parts screens: managers only (stock, costs and suppliers). */
export async function partsContext() {
    const ctx = await getContext()
    if (!ctx) return { error: unauthorizedResponse() } as const
    if (!isManager(ctx.role)) return { error: forbiddenResponse() } as const
    return { ctx } as const
}

export function bad(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status })
}

export function firstIssue(e: z.ZodError) {
    return e.issues[0]?.message ?? 'Dados inválidos'
}

const money = z.coerce.number().min(0).max(1_000_000)
const optText = (max: number) => z.string().trim().max(max).optional().nullable().transform(v => v || null)
export const uuid = z.string().uuid('ID inválido')

export const partSchema = z.object({
    name: z.string().trim().min(2, 'Informe o nome da peça').max(160),
    device_model: optText(120),
    part_quality: z.enum(PART_QUALITIES).optional().nullable(),
    location: optText(80),
    sku: optText(60),
    barcode: optText(60),
    category: optText(60),
    cost_price: money.default(0),
    selling_price: money.default(0),
    minimum_quantity: z.coerce.number().min(0).max(100000).default(0),
    supplier_id: uuid.optional().nullable(),
})

export const supplierSchema = z.object({
    name: z.string().trim().min(2, 'Informe o nome do fornecedor').max(160),
    phone: optText(40),
    notes: optText(500),
})

export const priceSchema = z.object({
    device_model: z.string().trim().min(1, 'Informe o aparelho').max(120),
    service: z.string().trim().min(2, 'Informe o serviço').max(120),
    part_item_id: uuid.optional().nullable(),
    labor_price: money.default(0),
    price: money.default(0),
    notes: optText(300),
})

export const DEFAULT_PART_MARGIN = 80

/** Price to charge: part cost marked up by the store margin, plus labor, rounded up to R$ 5. */
export function suggestedPrice(partCost: number, labor: number, marginPct: number) {
    const raw = partCost * (1 + marginPct / 100) + labor
    return raw > 0 ? Math.ceil(raw / 5) * 5 : 0
}
