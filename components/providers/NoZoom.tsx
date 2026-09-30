'use client'

import { useEffect } from 'react'

/**
 * Blocks pinch zoom, which Safari on iPhone allows even with
 * user-scalable=no. Double-tap zoom is already off (touch-action:
 * manipulation in globals.css) and inputs use 16px+ text, so focusing a
 * field doesn't zoom either.
 */
export default function NoZoom() {
    useEffect(() => {
        const stop = (e: Event) => e.preventDefault()
        // Two-finger moves only: one-finger scrolling stays untouched.
        const onMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
        document.addEventListener('gesturestart', stop, { passive: false })
        document.addEventListener('gesturechange', stop, { passive: false })
        document.addEventListener('touchmove', onMove, { passive: false })
        return () => {
            document.removeEventListener('gesturestart', stop)
            document.removeEventListener('gesturechange', stop)
            document.removeEventListener('touchmove', onMove)
        }
    }, [])
    return null
}
