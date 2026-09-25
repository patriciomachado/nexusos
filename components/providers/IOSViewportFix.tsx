'use client'

import { useEffect } from 'react'

/**
 * iPhone/iPad, app installed on the home screen: iOS sometimes lays out
 * fixed elements in a viewport shorter than the screen, so everything pinned
 * to the bottom (the app frame, action bars, sheets, the menu) stops short
 * and leaves a strip. Measure the missing height and expose it as --ios-gap;
 * elements with the `ios-fill` class stretch down by that much.
 *
 * The height is read from a `position: fixed; inset: 0` probe, which is
 * exactly the box the app frame gets, because window.innerHeight can report
 * the full screen while fixed elements still end short.
 */
export default function IOSViewportFix() {
    useEffect(() => {
        const nav = navigator as Navigator & { standalone?: boolean }
        const ua = navigator.userAgent
        const isIOS = /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
        const standalone = nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
        if (!isIOS || !standalone) return

        const probe = document.createElement('div')
        probe.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;visibility:hidden;pointer-events:none;z-index:-1'
        document.body.appendChild(probe)

        const root = document.documentElement
        const measure = () => {
            // Don't measure while the keyboard is up.
            const el = document.activeElement
            if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || (el as HTMLElement | null)?.isContentEditable) return
            const rect = probe.getBoundingClientRect()
            const landscape = window.innerWidth > window.innerHeight
            // screen.* is in portrait terms on iOS.
            const screenH = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height)
            const gap = Math.round(screenH - rect.bottom)
            if (gap > 0 && gap <= 200) {
                root.style.setProperty('--ios-gap', `${gap}px`)
                root.classList.add('ios-gap')
            } else {
                root.style.removeProperty('--ios-gap')
                root.classList.remove('ios-gap')
            }
        }
        const later = () => { setTimeout(measure, 350); setTimeout(measure, 1000) }
        const onVisible = () => { if (document.visibilityState === 'visible') later() }

        measure()
        later()
        const vv = window.visualViewport
        window.addEventListener('resize', measure)
        vv?.addEventListener('resize', measure)
        window.addEventListener('orientationchange', later)
        window.addEventListener('pageshow', later)
        document.addEventListener('focusout', later)
        document.addEventListener('visibilitychange', onVisible)
        // iOS doesn't always fire resize when the viewport settles; re-check now and then.
        const iv = setInterval(measure, 3000)
        return () => {
            clearInterval(iv)
            window.removeEventListener('resize', measure)
            vv?.removeEventListener('resize', measure)
            window.removeEventListener('orientationchange', later)
            window.removeEventListener('pageshow', later)
            document.removeEventListener('focusout', later)
            document.removeEventListener('visibilitychange', onVisible)
            probe.remove()
        }
    }, [])
    return null
}
