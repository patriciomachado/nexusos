'use client'

import { useEffect } from 'react'

/**
 * iPhone/iPad, app installed on the home screen: if iOS lays out fixed
 * elements in a box shorter than the app's window, everything pinned to the
 * bottom (the app frame, action bars, sheets, the menu) stops short. Measure
 * the missing height and expose it as --ios-gap; elements with the `ios-fill`
 * class stretch down by that much.
 *
 * The height is read from a `position: fixed; inset: 0` probe, which is
 * exactly the box the app frame gets.
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
            let off = false
            try { off = localStorage.getItem('nexus_iosfix_off') === '1' } catch { /* ignore */ }
            const rect = probe.getBoundingClientRect()
            // Compare with the app's own window, never with the screen: below
            // the opaque status bar the window is 59pt shorter than the screen
            // by design, and when iOS makes the window itself short nothing is
            // drawn below it. Either way stretching would push the bottom bars
            // and sheet buttons out of sight.
            const gap = Math.round(window.innerHeight - rect.bottom)
            if (!off && gap > 0 && gap <= 200) {
                root.style.setProperty('--ios-gap', `${gap}px`)
                root.classList.add('ios-gap')
            } else {
                root.style.removeProperty('--ios-gap')
                root.classList.remove('ios-gap')
            }
        }
        const later = () => { setTimeout(measure, 350); setTimeout(measure, 1000) }

        // iOS 26 can leave the page shifted after the keyboard closes; the app
        // itself never scrolls the window, so put it back at the top.
        const afterKeyboard = () => {
            setTimeout(() => {
                const el = document.activeElement
                if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
                if (window.scrollY !== 0 || (window.visualViewport?.offsetTop ?? 0) !== 0) window.scrollTo(0, 0)
                measure()
            }, 300)
            later()
        }
        const onVisible = () => { if (document.visibilityState === 'visible') later() }

        measure()
        later()
        const vv = window.visualViewport
        window.addEventListener('resize', measure)
        vv?.addEventListener('resize', measure)
        window.addEventListener('orientationchange', later)
        window.addEventListener('pageshow', later)
        document.addEventListener('focusout', afterKeyboard)
        document.addEventListener('visibilitychange', onVisible)
        // iOS doesn't always fire resize when the viewport settles; re-check now and then.
        const iv = setInterval(measure, 3000)
        return () => {
            clearInterval(iv)
            window.removeEventListener('resize', measure)
            vv?.removeEventListener('resize', measure)
            window.removeEventListener('orientationchange', later)
            window.removeEventListener('pageshow', later)
            document.removeEventListener('focusout', afterKeyboard)
            document.removeEventListener('visibilitychange', onVisible)
            probe.remove()
        }
    }, [])
    return null
}
