'use client'

import { useEffect, useState } from 'react'

export default function NotificationGenerator() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return
        
        const generateNotifications = async () => {
            try {
                await fetch('/api/notifications?generate=true', { method: 'GET' })
            } catch (error) {
                console.error('Error generating notifications:', error)
            }
        }
        
        generateNotifications()
    }, [mounted])

    if (!mounted) return null

    return null
}