'use client'

import { useEffect, useState } from 'react'
import { BellRing, BellOff, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Sheet from './Sheet'

type State = 'loading' | 'unsupported' | 'ios-install' | 'server-off' | 'denied' | 'off' | 'on'

function urlBase64ToUint8Array(base64: string) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4)
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null
    try {
        return await navigator.serviceWorker.register('/sw.js')
    } catch {
        return null
    }
}

/** "Lembretes no celular": subscribes this device to Web Push. */
export default function PushToggle({ className }: { className?: string }) {
    const [state, setState] = useState<State>('loading')
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [help, setHelp] = useState(false)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        let cancelled = false
        const check = async () => {
            const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
            if (!supported) {
                setState(isIos() && !isStandalone() ? 'ios-install' : 'unsupported')
                return
            }
            const res = await fetch('/api/push/subscribe').then(r => r.json()).catch(() => null)
            if (cancelled) return
            if (!res?.configured || !res.publicKey) { setState('server-off'); return }
            setPublicKey(res.publicKey)
            if (Notification.permission === 'denied') { setState('denied'); return }
            const reg = await registerServiceWorker()
            const sub = await reg?.pushManager.getSubscription()
            if (!cancelled) setState(sub ? 'on' : 'off')
        }
        check()
        return () => { cancelled = true }
    }, [])

    const enable = async () => {
        if (!publicKey) return
        setBusy(true)
        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                setState(permission === 'denied' ? 'denied' : 'off')
                return
            }
            const reg = await registerServiceWorker()
            if (!reg) throw new Error('sw')
            await navigator.serviceWorker.ready
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
            const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) })
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'save')
            setState('on')
            toast.success('Lembretes ativados neste aparelho', { description: 'Enviamos uma notificação de teste.' })
        } catch (e) {
            toast.error('Não foi possível ativar os lembretes', { description: e instanceof Error && e.message.length > 10 ? e.message : 'Tente de novo em alguns instantes.' })
        } finally {
            setBusy(false)
        }
    }

    const disable = async () => {
        setBusy(true)
        try {
            const reg = await navigator.serviceWorker.getRegistration('/sw.js')
            const sub = await reg?.pushManager.getSubscription()
            if (sub) {
                await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
                await sub.unsubscribe()
            }
            setState('off')
            toast('Lembretes desativados neste aparelho')
        } finally {
            setBusy(false)
        }
    }

    if (state === 'loading') return null

    const on = state === 'on'
    return (
        <>
            <button
                type="button"
                onClick={() => (state === 'off' ? enable() : state === 'on' ? disable() : setHelp(true))}
                disabled={busy}
                className={cn(
                    'h-9 px-3 rounded-full text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50',
                    on ? 'bg-green-500/12 text-green-700 dark:text-green-300' : 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]',
                    className
                )}
                title={on ? 'Desativar lembretes neste aparelho' : 'Receber lembretes neste aparelho'}
            >
                {on ? <BellRing className="w-4 h-4" /> : state === 'off' ? <Smartphone className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                {on ? 'Lembretes ativos' : 'Lembretes no celular'}
            </button>

            <Sheet open={help} onClose={() => setHelp(false)} title="Lembretes no celular">
                <div className="space-y-3 text-[15px] text-foreground pb-2">
                    {state === 'ios-install' && (
                        <>
                            <p>No iPhone, as notificações funcionam quando o NexusOS está na Tela de Início:</p>
                            <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                                <li>Toque em <strong className="text-foreground">Compartilhar</strong> no Safari.</li>
                                <li>Escolha <strong className="text-foreground">Adicionar à Tela de Início</strong>.</li>
                                <li>Abra o NexusOS pelo ícone e volte em Tarefas para ativar.</li>
                            </ol>
                        </>
                    )}
                    {state === 'denied' && (
                        <p>As notificações estão bloqueadas para este site. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço) e tente de novo.</p>
                    )}
                    {state === 'server-off' && (
                        <p>O envio de notificações ainda não foi configurado no servidor. É preciso cadastrar as chaves VAPID nas variáveis de ambiente da Vercel. Enquanto isso, os lembretes aparecem aqui no app e no sininho.</p>
                    )}
                    {state === 'unsupported' && (
                        <p>Este navegador não aceita notificações push. Use o Chrome, Edge, Firefox ou o Safari (macOS 13+ / iOS 16.4+).</p>
                    )}
                </div>
            </Sheet>
        </>
    )
}
