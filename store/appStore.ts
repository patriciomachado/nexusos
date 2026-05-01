import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Company, User } from '@/types'

interface AppState {
    user: User | null
    company: Company | null
    setUser: (user: User | null) => void
    setCompany: (company: Company | null) => void
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
    sidebarMode: 'hover' | 'open' | 'closed'
    setSidebarMode: (mode: 'hover' | 'open' | 'closed') => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            user: null,
            company: null,
            sidebarOpen: false,
            sidebarMode: 'hover',
            setUser: (user) => set({ user }),
            setCompany: (company) => set({ company }),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            setSidebarMode: (mode) => set({ sidebarMode: mode }),
        }),
        {
            name: 'nexus-app-store',
            partialize: (state) => ({ sidebarOpen: state.sidebarOpen, sidebarMode: state.sidebarMode }),
        }
    )
)
