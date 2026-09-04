'use client'

import { useEffect } from 'react'
import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'

export function usePerformanceTier() {
    const setPerformanceTier = use3dCatalogStore((state) => state.setPerformanceTier)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        const cores = navigator.hardwareConcurrency || 4

        if (isMobile || cores <= 4) {
            setPerformanceTier('medium')
        } else if (cores <= 2) {
            setPerformanceTier('low')
        } else {
            setPerformanceTier('high')
        }
    }, [setPerformanceTier])
}
