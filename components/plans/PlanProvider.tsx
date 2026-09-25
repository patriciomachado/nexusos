'use client'

import { createContext, useContext } from 'react'
import { hasFeature, type Feature, type PlanId } from '@/lib/plans'

const PlanContext = createContext<PlanId>('pro')

/** The company's plan, resolved on the server by the dashboard layout. */
export function PlanProvider({ plan, children }: { plan: PlanId; children: React.ReactNode }) {
    return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>
}

export function usePlan() {
    return useContext(PlanContext)
}

export function useFeature(feature: Feature) {
    return hasFeature(useContext(PlanContext), feature)
}
