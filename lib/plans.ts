/**
 * Plans and what each one includes. Shared by the app (gating, upgrade cards,
 * subscription page) and the landing page (pricing table).
 */
export type PlanId = 'essencial' | 'pro'
export type Feature = 'alice' | 'studio' | 'catalog' | 'reports_full' | 'post_sales_contact' | 'unlimited_users'

export interface Plan {
    id: PlanId
    name: string
    /** Monthly price in reais. */
    price: number
    tagline: string
    /** null = no limit. */
    maxUsers: number | null
    /** Alice replies per month (app + WhatsApp). */
    aliceReplies: number
    features: Feature[]
}

export const PLANS: Record<PlanId, Plan> = {
    essencial: {
        id: 'essencial',
        name: 'Essencial',
        price: 99,
        tagline: 'Para organizar a loja e ter controle do dia a dia.',
        maxUsers: 2,
        aliceReplies: 0,
        features: [],
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 249,
        tagline: 'Para crescer com equipe, IA e vendas online.',
        maxUsers: null,
        aliceReplies: 1500,
        features: ['alice', 'studio', 'catalog', 'reports_full', 'post_sales_contact', 'unlimited_users'],
    },
}

export const FEATURE_INFO: Record<Feature, { title: string; description: string }> = {
    alice: { title: 'Alice, assistente de IA', description: 'Consulta e age no sistema por texto ou voz e atende seus clientes no WhatsApp.' },
    studio: { title: 'Studio de conteúdo', description: 'Roteiros e artes para redes sociais gerados a partir dos seus serviços.' },
    catalog: { title: 'Catálogo online', description: 'Sua vitrine de aparelhos e produtos com link próprio para compartilhar.' },
    reports_full: { title: 'Relatórios completos', description: 'DRE, meta do mês, funil de OS, desempenho por técnico e clientes.' },
    post_sales_contact: { title: 'Pós-venda ativo', description: 'Lista de quem contatar depois da entrega, com mensagem pronta no WhatsApp.' },
    unlimited_users: { title: 'Equipe sem limite', description: 'Cadastre todos os técnicos, atendentes e caixas que precisar.' },
}

/** Pricing table rows (landing and subscription page). */
export const PLAN_ROWS: { label: string; essencial: boolean | string; pro: boolean | string }[] = [
    { label: 'Ordens de serviço com acompanhamento pelo cliente', essencial: true, pro: true },
    { label: 'PDV, caixa e contas fixas', essencial: true, pro: true },
    { label: 'Estoque, peças e aparelhos', essencial: true, pro: true },
    { label: 'Clientes, agenda e tarefas com lembretes', essencial: true, pro: true },
    { label: 'Relatórios', essencial: 'Faturamento e indicadores', pro: 'Completos (DRE, metas, técnicos)' },
    { label: 'Usuários', essencial: 'Até 2', pro: 'Sem limite' },
    { label: 'Alice (IA no app e no WhatsApp)', essencial: false, pro: 'Até 1.500 respostas/mês' },
    { label: 'Pós-venda com contato pelo WhatsApp', essencial: false, pro: true },
    { label: 'Catálogo online', essencial: false, pro: true },
    { label: 'Studio de conteúdo', essencial: false, pro: true },
]

export function hasFeature(plan: PlanId, feature: Feature) {
    return PLANS[plan].features.includes(feature)
}

export function isPlanId(value: unknown): value is PlanId {
    return value === 'essencial' || value === 'pro'
}

/** Pages that are Pro-only as a whole. */
export const PRO_ROUTES: { prefix: string; feature: Feature }[] = [
    { prefix: '/alice', feature: 'alice' },
    { prefix: '/studio', feature: 'studio' },
]

export function routeFeature(pathname: string | null): Feature | null {
    if (!pathname) return null
    return PRO_ROUTES.find(r => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))?.feature ?? null
}

export function priceLabel(plan: PlanId) {
    return `R$ ${PLANS[plan].price}`
}
