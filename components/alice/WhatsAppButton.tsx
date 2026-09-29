'use client'
import type { ReactNode } from 'react'
import { useOpenWhatsApp } from './useOpenWhatsApp'

type Props = {
    phone: string | null | undefined
    text?: string
    customerId?: string | null
    customerName?: string | null
    className?: string
    children: ReactNode
    onClick?: () => void
}

/** Drop-in replacement for an `<a href="https://wa.me/...">` button: uses the app's chat when possible. */
export default function WhatsAppButton({ phone, text, customerId, customerName, className, children, onClick }: Props) {
    const open = useOpenWhatsApp()
    return (
        <button type="button" onClick={() => { onClick?.(); open({ phone, text, customerId, customerName }) }} className={className}>
            {children}
        </button>
    )
}
