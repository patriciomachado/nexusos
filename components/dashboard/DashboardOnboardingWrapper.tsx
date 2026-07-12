'use client'

import { useState, useEffect } from 'react'
import DashboardOnboarding from './DashboardOnboarding'

interface DashboardOnboardingWrapperProps {
    companyId: string
    companyName: string
}

export default function DashboardOnboardingWrapper({ companyId, companyName }: DashboardOnboardingWrapperProps) {
    const [showOnboarding, setShowOnboarding] = useState(false)

    useEffect(() => {
        const completed = localStorage.getItem(`onboarding_completed_${companyId}`)
        // Always reset on query parameter ?reset-onboarding=true, otherwise check localStorage
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('reset-onboarding') === 'true' || !completed) {
            localStorage.removeItem(`onboarding_completed_${companyId}`)
            setShowOnboarding(true)
        }
    }, [companyId])

    const handleComplete = () => {
        localStorage.setItem(`onboarding_completed_${companyId}`, 'true')
        setShowOnboarding(false)
        window.location.reload() // Reload to fetch fresh configured data on dashboard
    }

    if (!showOnboarding) return null

    return (
        <DashboardOnboarding 
            companyId={companyId} 
            companyName={companyName} 
            onComplete={handleComplete} 
        />
    )
}
