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
            let off = false
            try { off = localStorage.getItem('nexus_iosfix_off') === '1' } catch { /* ignore */ }
            const rect = probe.getBoundingClientRect()
            const landscape = window.innerWidth > window.innerHeight
            // screen.* is in portrait terms on iOS.
            const screenH = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height)
            const gap = Math.round(Math.max(screenH - rect.bottom, screenH - window.innerHeight))
            if (!off && gap > 0 && gap <= 200) {
                root.style.setProperty('--ios-gap', `${gap}px`)
                root.classList.add('ios-gap')
            } else {
                root.style.removeProperty('--ios-gap')
                root.classList.remove('ios-gap')
            }
        }
        const later = () => { setTimeout(measure, 350); setTimeout(measure, 1000) }

        // iOS 18 can launch the installed app with its window 59pt (the status
        // bar) short at the bottom; rotating the phone fixes it. Changing the
        // viewport tag makes WebKit lay the window out again, like a rotation.
        const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
        const portraitShort = () => window.innerHeight < window.innerWidth ? false
            : Math.max(screen.width, screen.height) - window.innerHeight > 0
        let nudging = false
        const nudge = async () => {
            const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
            if (!meta || nudging || !portraitShort()) return
            nudging = true
            const base = meta.content
            const variants: [string, string][] = [
                ['escala', /initial-scale=[\d.]+/.test(base) ? base.replace(/initial-scale=[\d.]+/, 'initial-scale=1.0001') : `${base}, initial-scale=1.0001`],
                ['sem cover', base.replace(/,?\s*viewport-fit=cover/, '')],
            ]
            const log: string[] = []
            for (const [name, content] of variants) {
                if (!portraitShort()) break
                meta.content = content
                await wait(120)
                meta.content = base
                await wait(400)
                log.push(`${name}: ${portraitShort() ? 'não' : 'resolveu'}`)
            }
            try { sessionStorage.setItem('nexus_iosfix_nudge', log.join(' · ') || 'não precisou') } catch { /* ignore */ }
            nudging = false
            measure()
        }
        const onNudge = () => { void nudge() }
        setTimeout(onNudge, 400)
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
        const onVisible = () => { if (document.visibilityState === 'visible') { later(); setTimeout(onNudge, 400) } }

        measure()
        later()
        const vv = window.visualViewport
        window.addEventListener('resize', measure)
        vv?.addEventListener('resize', measure)
        window.addEventListener('orientationchange', later)
        window.addEventListener('pageshow', later)
        document.addEventListener('focusout', afterKeyboard)
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('nexus:ios-nudge', onNudge)
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
            window.removeEventListener('nexus:ios-nudge', onNudge)
            probe.remove()
        }
    }, [])
    return null
}
