'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Printer, Send } from 'lucide-react'

/** Print / save as PDF, share the text, or send it again on WhatsApp. */
export default function ReportActions({ id, text }: { id: string; text: string }) {
    const [sending, setSending] = useState(false)

    const share = async () => {
        const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }
        try {
            if (nav.share) await nav.share({ text: text.replace(/\*/g, '') })
            else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
        } catch { /* cancelled */ }
    }

    const resend = async () => {
        setSending(true)
        try {
            const r = await fetch(`/api/cash-registers/${id}/report`, { method: 'POST' }).then(x => x.json())
            if (r.sent) toast.success('Relatório enviado no WhatsApp')
            else if (r.reason === 'no_phone') toast.error('Cadastre o WhatsApp do relatório em Caixa → Ajustes.')
            else if (r.reason === 'no_whatsapp') toast.error('O WhatsApp da loja não está conectado. Use Compartilhar.')
            else toast.error('Não foi possível enviar agora.')
        } finally {
            setSending(false)
        }
    }

    const btn = 'h-9 px-3 rounded-full bg-foreground/[0.07] inline-flex items-center gap-1.5 text-[14px] font-medium'
    return (
        <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()} className={btn}><Printer className="w-4 h-4" /> PDF</button>
            <button type="button" onClick={share} className={btn}><Send className="w-4 h-4" /> Compartilhar</button>
            <button type="button" onClick={resend} disabled={sending} className={btn} aria-label="Enviar no WhatsApp da loja">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'WhatsApp'}
            </button>
        </div>
    )
}
