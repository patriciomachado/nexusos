export const FUNNEL_STAGES = ['lead', 'orcamento', 'negociacao', 'fechado', 'perdido'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export const STAGE_LABELS: Record<FunnelStage, string> = {
    lead: 'Lead / Contato',
    orcamento: 'Orçamento enviado',
    negociacao: 'Negociação',
    fechado: 'Fechado',
    perdido: 'Perdido',
}

export const STAGE_DOTS: Record<FunnelStage, string> = {
    lead: 'bg-blue-500',
    orcamento: 'bg-amber-500',
    negociacao: 'bg-violet-500',
    fechado: 'bg-emerald-500',
    perdido: 'bg-zinc-400',
}

export function isFunnelStage(value: unknown): value is FunnelStage {
    return typeof value === 'string' && (FUNNEL_STAGES as readonly string[]).includes(value)
}

export const FUNNEL_SOURCES = ['manual', 'whatsapp', 'alice', 'landing', 'indicacao', 'instagram'] as const
export type FunnelSource = (typeof FUNNEL_SOURCES)[number]

export const SOURCE_LABELS: Record<FunnelSource, string> = {
    manual: 'Manual',
    whatsapp: 'WhatsApp',
    alice: 'Alice',
    landing: 'Página de captação',
    indicacao: 'Indicação',
    instagram: 'Instagram',
}
