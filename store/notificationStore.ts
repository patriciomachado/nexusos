import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

interface NotificationState {
    notifications: Notification[]
    unreadCount: number
    isLoading: boolean
    fetchNotifications: (userId: string) => Promise<void>
    markAsRead: (id: string) => Promise<void>
    addNotification: (notification: Partial<Notification>) => Promise<void>
    clearAll: () => void
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,
            isLoading: false,

            fetchNotifications: async (userId) => {
                if (!userId) {
                    console.warn('fetchNotifications called without userId')
                    return
                }
                set({ isLoading: true })
                try {
                    // Try to fetch notifications where user_id matches the provided ID
                    // The RLS policy will handle the logic of which ID to match
                    const { data, error } = await supabase
                        .from('notifications')
                        .select('*')
                        .or(`user_id.eq.${userId},user_id.is.null`)
                        .order('created_at', { ascending: false })
                        .limit(20)

                    if (error) {
                        console.error('Supabase error fetching notifications:', error)
                        throw error
                    }

                    const unread = data?.filter(n => n.status !== 'read').length || 0
                    set({ notifications: data || [], unreadCount: unread })
                } catch (error) {
                    console.error('Error fetching notifications:', error)
                } finally {
                    set({ isLoading: false })
                }
            },

            markAsRead: async (id) => {
                try {
                    const { error } = await supabase
                        .from('notifications')
                        .update({ status: 'read', read_at: new Date().toISOString() })
                        .eq('id', id)

                    if (error) throw error

                    const updatedNotifications = get().notifications.map(n =>
                        n.id === id ? { ...n, status: 'read' as const } : n
                    )
                    const unread = updatedNotifications.filter(n => n.status !== 'read').length
                    set({ notifications: updatedNotifications, unreadCount: unread })
                } catch (error) {
                    console.error('Error marking notification as read:', error)
                }
            },

            addNotification: async (notification) => {
                // For now, only internal state addition or direct DB insert if triggered by app logic
                const newNotif = {
                    ...notification,
                    id: Math.random().toString(36).substring(7),
                    created_at: new Date().toISOString(),
                    status: 'pending' as const
                } as Notification

                set({
                    notifications: [newNotif, ...get().notifications].slice(0, 20),
                    unreadCount: get().unreadCount + 1
                })
            },

            clearAll: () => set({ notifications: [], unreadCount: 0 })
        }),
        {
            name: 'nexus-notification-store',
            partialize: (state) => ({ notifications: state.notifications, unreadCount: state.unreadCount }),
        }
    )
)
