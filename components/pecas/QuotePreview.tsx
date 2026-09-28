'use client'

import { toast } from 'sonner'
import { Copy, MessageCircle } from 'lucide-react'
import { SecondaryButton } from '@/components/ui/form'

function waLink(text: string) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/** Mensagem pronta do orçamento (opções + link), com botão de copiar e de abrir no WhatsApp. */
export default function QuotePreview({ message }: { message: string }) {
    return (
        <div className="rounded-xl bg-foreground/[0.04] p-3 space-y-2">
            <p className="text-[13px] whitespace-pre-line">{message}</p>
            <div className="flex gap-2">
                <SecondaryButton onClick={() => { navigator.clipboard?.writeText(message); toast.success('Mensagem copiada') }} className="flex-1 h-9 text-[14px]"><Copy className="w-3.5 h-3.5" /> Copiar mensagem</SecondaryButton>
                <a href={waLink(message)} target="_blank" rel="noreferrer" className="flex-1 h-9 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 text-[14px] font-medium flex items-center justify-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
            </div>
        </div>
    )
}
