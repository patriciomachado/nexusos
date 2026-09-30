import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getContext, unauthorizedResponse, forbiddenResponse } from '@/lib/security'

const profile = z.object({
    name: z.string().trim().min(2, 'Informe o nome da loja').max(120),
    phone: z.string().trim().max(30).nullable().optional(),
    cnpj: z.string().trim().max(30).nullable().optional(),
    logo_url: z.string().trim().max(1000).nullable().optional(),
    zip_code: z.string().trim().max(12).nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    state: z.string().trim().max(2).nullable().optional(),
    warranty_terms: z.string().trim().max(4000).nullable().optional(),
    google_review_url: z.string().trim().max(1000).nullable().optional(),
})

const body = z.discriminatedUnion('action', [
    z.object({ action: z.literal('save'), company: profile.partial().extend({ name: profile.shape.name.optional() }) }),
    z.object({ action: z.literal('finish') }),
])

/** Saves the setup assistant's answers and records that it was finished or skipped. */
export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!['admin', 'owner'].includes(ctx.role)) return forbiddenResponse()

    const parsed = body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })

    const { data: company, error: readError } = await ctx.db.from('companies').select('settings').eq('id', ctx.companyId).single()
    if (readError) return NextResponse.json({ error: 'Não foi possível ler os dados da loja' }, { status: 500 })
    const settings = (company?.settings as Record<string, unknown> | null) ?? {}

    const update = parsed.data.action === 'save'
        ? Object.fromEntries(Object.entries(parsed.data.company).map(([k, v]) => [k, v === '' ? null : v]))
        : { settings: { ...settings, onboarding_completed_at: new Date().toISOString() } }

    const { error } = await ctx.db.from('companies').update(update).eq('id', ctx.companyId)
    if (error) {
        console.error('[onboarding] save failed:', error)
        return NextResponse.json({ error: 'Não foi possível salvar. Tente de novo.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
}
