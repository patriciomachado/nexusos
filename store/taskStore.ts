import { create } from 'zustand'
import { localDateString } from '@/lib/tasks/dates'

export interface TaskSummary {
    /** Tasks past their deadline. */
    overdue: number
    /** Open tasks scheduled for today. */
    today: number
    /** Alerts coming from the other modules. */
    alerts: number
    /** Everything that needs attention today (badge value). */
    total: number
}

interface TaskStoreState {
    summary: TaskSummary | null
    lastFetched: number
    fetchSummary: (force?: boolean) => Promise<void>
}

const STALE_MS = 60_000

export const useTaskStore = create<TaskStoreState>()((set, get) => ({
    summary: null,
    lastFetched: 0,
    fetchSummary: async (force = false) => {
        if (!force && Date.now() - get().lastFetched < STALE_MS) return
        set({ lastFetched: Date.now() })
        try {
            const res = await fetch(`/api/tasks/summary?today=${localDateString()}`, { cache: 'no-store' })
            if (!res.ok) return
            const data = await res.json()
            set({ summary: data })
        } catch {
            // Badge is best-effort; the Tarefas page shows real errors.
        }
    },
}))
