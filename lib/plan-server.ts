import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { FEATURE_INFO, hasFeature, type Feature, type PlanId } from './plans'

/**
 * The plan a company is on. Trials get Pro so people try everything; if the
 * plan column is missing (migration not run yet) nobody loses features.
 */
export async function getCompanyPlan(db: SupabaseClient, companyId: string | null | undefined): Promise<PlanId> {
    if (!companyId) return 'pro'
    const { data, error } = await db.from('subscriptions').select('status, plan').eq('company_id', companyId).maybeSingle()
    if (error || !data) return 'pro'
    if (data.status === 'trial') return 'pro'
    return data.plan === 'essencial' ? 'essencial' : 'pro'
}

export async function companyHasFeature(db: SupabaseClient, companyId: string | null | undefined, feature: Feature) {
    return hasFeature(await getCompanyPlan(db, companyId), feature)
}

/** 403 for an API call that needs a Pro feature. */
export function planRequiredResponse(feature: Feature) {
    return NextResponse.json(
        { error: `${FEATURE_INFO[feature].title} faz parte do plano Pro.`, code: 'PLAN_REQUIRED', feature },
        { status: 403 }
    )
}
