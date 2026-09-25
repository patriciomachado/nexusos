import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'
import { companyHasFeature, planRequiredResponse } from '@/lib/plan-server'
import { listStores } from '@/lib/stores/server'
import { monthRange } from '@/lib/team/server'

/**
 * Stores this login can use, with this month's revenue and open OS for the
 * ones where it manages, so the owner can compare head office and branches.
 */
export async function GET() {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId, role, userId } = ctx
    const stores = await listStores(db, userId, companyId, role)
    const month = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
    const { from, to } = monthRange(month)

    const withNumbers = await Promise.all(stores.map(async s => {
        if (!isManager(s.role)) return { ...s, revenue: null, open_os: null }
        const [{ data: pays }, { count }] = await Promise.all([
            db.from('payments').select('amount').eq('company_id', s.id).eq('payment_status', 'completed').gte('payment_date', from).lt('payment_date', to).limit(20000),
            db.from('service_orders').select('id', { count: 'exact', head: true }).eq('company_id', s.id).not('status', 'in', '(entregue,faturada,cancelada)'),
        ])
        const revenue = Math.round((pays ?? []).reduce((a, p) => a + (Number(p.amount) || 0), 0) * 100) / 100
        return { ...s, revenue, open_os: count ?? 0 }
    }))

    return NextResponse.json({
        stores: withNumbers,
        can_create: isOwner(role),
        has_feature: await companyHasFeature(db, companyId, 'multi_store'),
    })
}

const createSchema = z.object({
    name: z.string().trim().min(2, 'Informe o nome da filial').max(120),
    city: z.string().trim().max(80).optional().nullable(),
    phone: z.string().trim().max(30).optional().nullable(),
    copy_settings: z.boolean().optional().default(true),
})

/** Opens a branch under the same subscription; the owner can switch into it right away. */
export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const { db, companyId, role, userId } = ctx
    if (!isOwner(role)) return forbiddenResponse()
    if (!(await companyHasFeature(db, companyId, 'multi_store'))) return planRequiredResponse('multi_store')

    const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    const input = parsed.data

    const { data: current } = await db.from('companies').select('*').eq('id', companyId).single()
    if (!current) return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
    const headOffice = (current.parent_company_id as string | null) ?? companyId

    const { count } = await db.from('companies').select('id', { count: 'exact', head: true }).eq('parent_company_id', headOffice)
    if ((count ?? 0) >= 20) return NextResponse.json({ error: 'Limite de 20 filiais atingido. Fale com o suporte.' }, { status: 400 })

    // Carry over how documents look, register rules and page permissions;
    // WhatsApp, Alice and team settings stay per store.
    const settings = (current.settings ?? {}) as Record<string, unknown>
    const copied = input.copy_settings
        ? Object.fromEntries(['documents', 'receipt', 'cash', 'permissions'].filter(k => k in settings).map(k => [k, settings[k]]))
        : {}

    const { data: branch, error } = await db.from('companies').insert({
        name: input.name,
        city: input.city || null,
        phone: input.phone || null,
        logo_url: current.logo_url ?? null,
        warranty_terms: current.warranty_terms ?? null,
        subscription_plan: current.subscription_plan ?? 'pro',
        subscription_status: current.subscription_status ?? 'active',
        parent_company_id: headOffice,
        settings: copied,
    }).select('id, name').single()
    if (error || !branch) return NextResponse.json({ error: error?.message ?? 'Não foi possível criar a filial' }, { status: 500 })

    const { error: accessError } = await db.from('store_access').upsert([
        { clerk_id: userId, company_id: companyId, role },
        { clerk_id: userId, company_id: branch.id, role: 'admin' },
    ], { onConflict: 'clerk_id,company_id' })
    if (accessError) {
        await db.from('companies').delete().eq('id', branch.id)
        return NextResponse.json({ error: accessError.message }, { status: 500 })
    }

    // Same payment options as the current store so the branch can sell on day one.
    const { data: methods } = await db.from('payment_methods').select('name, code, is_active').eq('company_id', companyId)
    if (methods?.length) {
        await db.from('payment_methods').insert(methods.map(m => ({ name: m.name, code: m.code, is_active: m.is_active, company_id: branch.id })))
    }

    return NextResponse.json({ store: branch }, { status: 201 })
}
