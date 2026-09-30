import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FunnelSource, FunnelStage } from './stages'

export interface NewFunnelEntry {
    companyId: string
    title: string
    customerId?: string | null
    leadName?: string | null
    leadPhone?: string | null
    stage?: FunnelStage
    valueEstimate?: number
    source: FunnelSource
    quoteId?: string | null
    serviceOrderId?: string | null
    saleId?: string | null
    notes?: string | null
    createdBy?: string | null
    assignedTo?: string | null
}

/** Shared by the Funil screen (manual card) and the Alice tool (criar_orcamento), so both land in the same pipeline. */
export async function createFunnelEntry(db: SupabaseClient, input: NewFunnelEntry) {
    const { data, error } = await db
        .from('funnel_entries')
        .insert({
            company_id: input.companyId,
            customer_id: input.customerId ?? null,
            lead_name: input.leadName ?? null,
            lead_phone: input.leadPhone ?? null,
            title: input.title.slice(0, 200),
            stage: input.stage ?? 'lead',
            value_estimate: input.valueEstimate ?? 0,
            source: input.source,
            quote_id: input.quoteId ?? null,
            service_order_id: input.serviceOrderId ?? null,
            sale_id: input.saleId ?? null,
            notes: input.notes ?? null,
            created_by: input.createdBy ?? null,
            assigned_to: input.assignedTo ?? input.createdBy ?? null,
        })
        .select('id, stage')
        .single()
    if (error || !data) throw new Error(error?.message || 'Não foi possível criar o card no funil.')
    return data
}

/** Moves a card to a new stage (drag on the board, or a write tool closing/losing it). */
export async function moveFunnelEntry(db: SupabaseClient, companyId: string, id: string, patch: { stage: FunnelStage; lostReason?: string | null; serviceOrderId?: string | null }) {
    const update: Record<string, unknown> = {
        stage: patch.stage,
        stage_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lost_reason: patch.stage === 'perdido' ? (patch.lostReason ?? null) : null,
    }
    if (patch.serviceOrderId !== undefined) update.service_order_id = patch.serviceOrderId
    const { error } = await db
        .from('funnel_entries')
        .update(update)
        .eq('id', id)
        .eq('company_id', companyId)
    if (error) throw new Error(error.message)
}

/** Card do funil ligado a este orçamento, se existir (a Alice ou o dashboard já podem tê-lo criado). */
export async function findFunnelEntryByQuote(db: SupabaseClient, companyId: string, quoteId: string) {
    const { data } = await db.from('funnel_entries').select('id').eq('company_id', companyId).eq('quote_id', quoteId).maybeSingle()
    return data?.id as string | undefined
}
