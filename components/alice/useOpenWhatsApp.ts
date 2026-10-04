'use client'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

type OpenArgs = {
    phone: string | null | undefined
    text?: string
    customerId?: string | null
    customerName?: string | null
}

function rawLink(phone: string | null | undefined, text?: string) {
    const d = (phone ?? '').replace(/\D/g, '')
    const full = d ? (d.startsWith('55') && d.length >= 12 ? d : `55${d}`) : ''
    return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/**
 * Opens a WhatsApp conversation: through the app's own chat when the store's WhatsApp is connected,
 * falling back to a wa.me link (new tab) exactly like before otherwise.
 */
export function useOpenWhatsApp() {
    const router = useRouter()

    return useCallback(async ({ phone, text, customerId, customerName }: OpenArgs) => {
        if (!phone) {
            window.open(rawLink(phone, text), '_blank')
            return
        }
        try {
            const res = await fetch('/api/alice/conversations/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, customerId: customerId || undefined, customerName: customerName || undefined }),
            })
            if (res.ok) {
                const data = await res.json()
                if (data.available && data.id) {
                    router.push(`/alice?conversa=${data.id}${text ? `&texto=${encodeURIComponent(text)}` : ''}`)
                    return
                }
            }
        } catch {
            // network error or no access: fall through to wa.me below
        }
        window.open(rawLink(phone, text), '_blank')
    }, [router])
}
