import { create } from 'zustand'

export type CatalogSection = 'intro' | 'progress' | 'gallery' | 'pricing' | 'cta'

export interface DeviceData {
    id: string
    brand: string
    model: string
    storage?: string
    color?: string
    condition: string
    cash_price: number
    battery_health: number
    images?: string[]
}

interface Catalog3DState {
    scrollProgress: number
    activeSectionIndex: number
    activeSection: CatalogSection
    selectedDeviceIndex: number
    isDraggingDevice: boolean
    manualRotation: [number, number]
    performanceTier: 'high' | 'medium' | 'low'
    soundMuted: boolean
    
    // Actions
    setScrollProgress: (progress: number) => void
    setActiveSectionIndex: (index: number) => void
    setSelectedDeviceIndex: (index: number) => void
    setIsDraggingDevice: (isDragging: boolean) => void
    setManualRotation: (manualRotation: [number, number]) => void
    setPerformanceTier: (tier: 'high' | 'medium' | 'low') => void
    toggleSoundMuted: () => void
}

const SECTIONS: CatalogSection[] = ['intro', 'progress', 'gallery', 'pricing', 'cta']

export const use3dCatalogStore = create<Catalog3DState>((set) => ({
    scrollProgress: 0,
    activeSectionIndex: 0,
    activeSection: 'intro',
    selectedDeviceIndex: 0,
    isDraggingDevice: false,
    manualRotation: [0, 0],
    performanceTier: 'high',
    soundMuted: true,

    setScrollProgress: (progress) => {
        const clamped = Math.max(0, Math.min(1, progress))
        const sectionIdx = Math.min(
            SECTIONS.length - 1,
            Math.floor(clamped * SECTIONS.length)
        )
        set({
            scrollProgress: clamped,
            activeSectionIndex: sectionIdx,
            activeSection: SECTIONS[sectionIdx],
        })
    },

    setActiveSectionIndex: (index) => {
        const idx = Math.max(0, Math.min(SECTIONS.length - 1, index))
        set({
            activeSectionIndex: idx,
            activeSection: SECTIONS[idx],
        })
    },

    setSelectedDeviceIndex: (index) => set({ selectedDeviceIndex: index }),
    setIsDraggingDevice: (isDragging) => set({ isDraggingDevice: isDragging }),
    setManualRotation: (manualRotation) => set({ manualRotation }),
    setPerformanceTier: (performanceTier) => set({ performanceTier }),
    toggleSoundMuted: () => set((state) => ({ soundMuted: !state.soundMuted })),
}))
