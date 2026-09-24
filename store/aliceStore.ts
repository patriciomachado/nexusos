import { create } from 'zustand'

export interface AliceStatus {
    available: boolean
    isAdmin: boolean
    /** 'migration' | 'api_key' when an admin still has setup to do. */
    setupNeeded: string | null
    configured: boolean
    transcription: boolean
}

interface AliceStoreState {
    status: AliceStatus | null
    open: boolean
    /** Text to send as soon as the panel opens (e.g. from a suggestion elsewhere). */
    pending: string | null
    fetchStatus: () => Promise<void>
    setOpen: (open: boolean, pending?: string | null) => void
}

let inflight: Promise<void> | null = null

export const useAliceStore = create<AliceStoreState>()((set) => ({
    status: null,
    open: false,
    pending: null,
    fetchStatus: () => {
        inflight ??= (async () => {
            try {
                const res = await fetch('/api/alice/status', { cache: 'no-store' })
                if (res.ok) set({ status: await res.json() })
            } catch {
                // Offline: the button just stays hidden.
            } finally {
                inflight = null
            }
        })()
        return inflight
    },
    setOpen: (open, pending = null) => set({ open, pending }),
}))
