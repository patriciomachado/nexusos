'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { tasksApi, emitTasksChanged } from './api'
import { useNotificationStore } from '@/store/notificationStore'

const POLL_MS = 60_000

/**
 * Delivers task reminders while the app is open (admin only). The server
 * claims each reminder once, adds it to the bell and pushes it to phones; this
 * tab shows it as a banner right away.
 */
export default function ReminderWatcher() {
    const router = useRouter()
    const fetchNotifications = useNotificationStore(s => s.fetchNotifications)

    useEffect(() => {
        let stopped = false
        let running = false

        const tick = async () => {
            if (stopped || running) return
            running = true
            try {
                const { reminders } = await tasksApi.dueReminders()
                if (reminders.length === 0) return
                fetchNotifications()
                emitTasksChanged()
                for (const r of reminders) {
                    toast(r.title, {
                        description: r.body,
                        duration: 15_000,
                        action: { label: 'Abrir', onClick: () => router.push(r.url) },
                    })
                    // A native banner when this tab is in the background and push isn't set up.
                    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
                        const reg = await navigator.serviceWorker?.getRegistration('/sw.js')
                        const hasPush = !!(await reg?.pushManager.getSubscription())
                        if (!hasPush) {
                            if (reg) reg.showNotification(r.title, { body: r.body, icon: '/logo.png', tag: `task-${r.task_id}`, data: { url: r.url } })
                            else new Notification(r.title, { body: r.body, icon: '/logo.png' })
                        }
                    }
                }
            } catch {
                // Missing migration or offline: stay quiet, the page shows errors.
            } finally {
                running = false
            }
        }

        tick()
        const id = setInterval(tick, POLL_MS)
        const onVisible = () => { if (document.visibilityState === 'visible') tick() }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            stopped = true
            clearInterval(id)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [router, fetchNotifications])

    return null
}
