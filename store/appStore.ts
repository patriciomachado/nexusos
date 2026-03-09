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
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            user: null,
            company: null,
            sidebarOpen: true,
            setUser: (user) => set({ user }),
            setCompany: (company) => set({ company }),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
        }),
        {
            name: 'nexus-app-store',
            partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
        }
    )
)
