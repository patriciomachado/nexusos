'use client'

import { useEffect } from 'react'

export default function NotificationGenerator() {
    useEffect(() => {
        const generateNotifications = async () => {
            try {
                await fetch('/api/notifications?generate=true', { method: 'GET' })
            } catch (error) {
                console.error('Error generating notifications:', error)
            }
        }
        
        generateNotifications()
    }, [])

    return null
}