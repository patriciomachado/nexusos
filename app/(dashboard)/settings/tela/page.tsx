'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import { Group, PrimaryButton, SecondaryButton, SwitchRow } from '@/components/ui/form'

/**
 * Screen diagnostics for the installed app: measures the screen, the
 * viewport and the area fixed elements get, and draws markers at each
 * bottom edge, so a screenshot shows exactly where the app stops.
 */

type Row = [string, string]

function measureUnit(unit: string) {
    const el = document.createElement('div')
    el.style.cssText = `position:absolute;visibility:hidden;height:100${unit};width:1px;top:0`
    document.body.appendChild(el)
    const h = el.getBoundingClientRect().height
    el.remove()
    return Math.round(h)
}

function readEnv() {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
    document.body.appendChild(el)
    const cs = getComputedStyle(el)
    const r = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }
    el.remove()
    return r
}

function fixedBottom() {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;visibility:hidden'
    document.body.appendChild(el)
    const b = el.getBoundingClientRect().bottom
    el.remove()
    return Math.round(b)
}

export default function ScreenDiagnosticsPage() {
    const [rows, setRows] = useState<Row[]>([])
    const [marks, setMarks] = useState({ screen: 0, fixed: 0, visual: 0 })
    const [fixOff, setFixOff] = useState(false)
    const [mounted, setMounted] = useState(false)

    const run = useCallback(() => {
        const nav = navigator as Navigator & { standalone?: boolean }
        const vv = window.visualViewport
        const env = readEnv()
        const screenH = Math.max(screen.width, screen.height)
        const fb = fixedBottom()
        const root = document.documentElement
        const iosVersion = navigator.userAgent.match(/OS (\d+[_\d]*)/)?.[1]?.replace(/_/g, '.') ?? '—'
        setMarks({ screen: env.top > 0 ? screenH : window.innerHeight, fixed: fb, visual: vv ? Math.round(vv.height + vv.offsetTop) : window.innerHeight })
        setRows([
            ['iOS', iosVersion],
            ['App instalado', nav.standalone === true || matchMedia('(display-mode: standalone)').matches ? 'sim' : 'não'],
            ['Tela (screen)', `${screen.width} × ${screen.height}`],
            ['Janela (inner)', `${window.innerWidth} × ${window.innerHeight}`],
            ['clientHeight', String(root.clientHeight)],
            ['visualViewport', vv ? `${Math.round(vv.width)} × ${Math.round(vv.height)} · topo ${Math.round(vv.offsetTop)} · escala ${vv.scale.toFixed(2)}` : '—'],
            ['Fim dos fixos', String(fb)],
            ['100vh / svh / lvh / dvh', ['vh', 'svh', 'lvh', 'dvh'].map(measureUnit).join(' / ')],
            ['Área segura', `topo ${env.top} · base ${env.bottom}`],
            ['Rolagem da janela', String(Math.round(window.scrollY))],
            ['Correção (--ios-gap)', root.classList.contains('ios-gap') ? root.style.getPropertyValue('--ios-gap') || 'sim' : 'não'],
            ['Tag apple-capable', document.querySelector('meta[name="apple-mobile-web-app-capable"]') ? 'sim' : 'não'],
            ['Barra de status', env.top > 0 ? 'translúcida (app começa no topo da tela)' : 'opaca (app começa abaixo do relógio)'],
            ['Janela do app curta', env.top > 0 && window.innerHeight < screenH ? `sim, ${screenH - window.innerHeight} pt (some ao girar o celular)` : 'não'],
            // Below an opaque bar the app starts at the status bar's bottom.
            ['Faltando embaixo', `${Math.max(0, (env.top > 0 ? screenH : window.innerHeight) - fb)} px`],
        ])
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
        try { setFixOff(localStorage.getItem('nexus_iosfix_off') === '1') } catch { /* ignore */ }
        run()
        const t = setInterval(run, 1000)
        return () => clearInterval(t)
    }, [run])

    const copy = async () => {
        const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n')
        try {
            await navigator.clipboard.writeText(text)
            toast.success('Copiado. Cole na conversa.')
        } catch {
            toast.error('Não deu para copiar. Tire um print.')
        }
    }

    const toggleFix = (off: boolean) => {
        setFixOff(off)
        try { localStorage.setItem('nexus_iosfix_off', off ? '1' : '0') } catch { /* ignore */ }
        window.dispatchEvent(new Event('resize'))
    }

    return (
        <div className="min-h-full bg-background">
            <Header title="Diagnóstico da tela" />
            <div className="max-w-2xl mx-auto px-4 pt-4 pb-40 space-y-5">
                <p className="px-1 text-[15px] text-muted-foreground">
                    Tire um print desta tela <strong className="text-foreground">no app instalado</strong> e mande na conversa.
                    As linhas coloridas marcam onde cada coisa termina: <span className="text-red-600 font-medium">vermelho</span> = fim da tela,
                    {' '}<span className="text-sky-600 font-medium">azul</span> = fim da área do app,
                    {' '}<span className="text-emerald-600 font-medium">verde</span> = fim da área visível.
                </p>
                <Group>
                    {rows.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-3 px-4 min-h-[44px]">
                            <span className="text-[15px] text-muted-foreground">{k}</span>
                            <span className="text-[15px] font-medium tabular-nums text-right">{v}</span>
                        </div>
                    ))}
                </Group>
                <Group>
                    <SwitchRow label="Desligar a correção automática" description="Para comparar: tire um print com e sem." checked={fixOff} onChange={toggleFix} />
                </Group>
                <div className="flex gap-3">
                    <SecondaryButton className="flex-1" onClick={() => { window.scrollTo(0, 0); run() }}>Medir de novo</SecondaryButton>
                    <PrimaryButton className="flex-1" onClick={copy}>Copiar números</PrimaryButton>
                </div>
            </div>

            {mounted && createPortal(
                <div aria-hidden className="pointer-events-none">
                    <div className="fixed left-0 right-0 z-[2000] h-[3px] bg-red-500" style={{ top: marks.screen - 3 }} />
                    <div className="fixed left-0 z-[2000] px-1 text-[11px] font-semibold text-white bg-red-500" style={{ top: marks.screen - 18 }}>tela {marks.screen}</div>
                    <div className="fixed left-0 right-0 bottom-0 z-[2001] h-[3px] bg-sky-500" />
                    <div className="fixed left-24 bottom-[3px] z-[2001] px-1 text-[11px] font-semibold text-white bg-sky-500">app {marks.fixed}</div>
                    <div className="fixed left-0 right-0 z-[2002] h-[3px] bg-emerald-500" style={{ top: marks.visual - 3 }} />
                    <div className="fixed left-48 z-[2002] px-1 text-[11px] font-semibold text-white bg-emerald-500" style={{ top: marks.visual - 18 }}>visível {marks.visual}</div>
                </div>,
                document.body
            )}
        </div>
    )
}
