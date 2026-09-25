'use client'

import { useEffect } from 'react'

/**
 * iPhone, app installed on the home screen: iOS sometimes reports a layout
 * viewport shorter than the screen, so everything pinned to the bottom
 * (the app frame, action bars, sheets, the menu) stops short and leaves a
 * strip. Measure the missing height and expose it as --ios-gap; elements
 * with the `ios-fill` class stretch down by that much.
 *
 * Only runs when the app draws under the status bar (safe-area top > 0),
 * i.e. the web view really covers the whole screen. Elsewhere --ios-gap is 0.
 */
export default function IOSViewportFix() {
    useEffect(() => {
        const nav = navigator as Navigator & { standalone?: boolean }
        const isIphone = /iPhone|iPod/.test(navigator.userAgent)
        const standalone = nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
        if (!isIphone || !standalone) return

        const probe = document.createElement('div')
        probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)'
        document.body.appendChild(probe)

        const root = document.documentElement
        const measure = () => {
            // Don't measure while the keyboard is up.
            const el = document.activeElement
            if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
            const insetTop = parseFloat(getComputedStyle(probe).paddingTop) || 0
            const screenH = Math.max(window.screen.width, window.screen.height)
            const portrait = window.innerHeight >= window.innerWidth
            const gap = insetTop > 0 && portrait ? Math.round(screenH - window.innerHeight) : 0
            if (gap > 0 && gap <= 160) {
                root.style.setProperty('--ios-gap', `${gap}px`)
                root.classList.add('ios-gap')
            } else {
                root.style.removeProperty('--ios-gap')
                root.classList.remove('ios-gap')
            }
        }

        measure()
        const t = setTimeout(measure, 500)
        window.addEventListener('resize', measure)
        window.addEventListener('orientationchange', measure)
        window.addEventListener('pageshow', measure)
        return () => {
            clearTimeout(t)
            window.removeEventListener('resize', measure)
            window.removeEventListener('orientationchange', measure)
            window.removeEventListener('pageshow', measure)
            probe.remove()
        }
    }, [])
    return null
}
