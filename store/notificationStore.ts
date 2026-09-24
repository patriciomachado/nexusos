import { create } from 'zustand'
import type { Notification } from '@/types'

interface NotificationState {
    notifications: Notification[]
    unreadCount: number
    isLoading: boolean
    /** `_userId` is kept for backwards compatibility; the API scopes by session. */
    fetchNotifications: (_userId?: string) => Promise<void>
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
    addNotification: (notification: Partial<Notification>) => Promise<void>
    clearAll: () => void
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async () => {
        set({ isLoading: get().notifications.length === 0 })
        try {
            const res = await fetch('/api/notifications', { cache: 'no-store' })
            if (!res.ok) return
            const json = await res.json()
            const data: Notification[] = json.data || []
            set({ notifications: data, unreadCount: data.filter(n => n.status !== 'read').length })
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    markAsRead: async (id) => {
        const updated = get().notifications.map(n => (n.id === id ? { ...n, status: 'read' as const } : n))
        set({ notifications: updated, unreadCount: updated.filter(n => n.status !== 'read').length })
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            })
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    },

    markAllAsRead: async () => {
        set({ notifications: get().notifications.map(n => ({ ...n, status: 'read' as const })), unreadCount: 0 })
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true }),
            })
        } catch (error) {
            console.error('Error marking notifications as read:', error)
        }
    },

    addNotification: async (notification) => {
        const newNotif = {
            ...notification,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            status: 'pending' as const
        } as Notification

        set({
            notifications: [newNotif, ...get().notifications].slice(0, 50),
            unreadCount: get().unreadCount + 1
        })
    },

    clearAll: () => set({ notifications: [], unreadCount: 0 })
}))
