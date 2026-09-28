'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, ExternalLink } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { PrimaryButton } from '@/components/ui/form'

/** Briefing text the user copies into Canva (or any image AI) for a more elaborate version of the card. */
export default function CanvaPromptSheet({ open, onClose, prompt }: { open: boolean; onClose: () => void; prompt: string }) {
    const [copied, setCopied] = useState(false)

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(prompt)
            setCopied(true)
            toast.success('Prompt copiado')
            setTimeout(() => setCopied(false), 1500)
        } catch {
            toast.error('Não foi possível copiar')
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Prompt para o Canva"
            subtitle="Cole no Canva ou em outra IA de imagem para uma arte mais elaborada"
            size="lg"
            footer={
                <>
                    <a
                        href="https://www.canva.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="h-11 px-4 rounded-xl text-[15px] text-primary hover:bg-foreground/[0.05] inline-flex items-center gap-1.5"
                    >
                        <ExternalLink aria-hidden className="w-4 h-4" /> Abrir Canva
                    </a>
                    <div className="flex-1" />
                    <PrimaryButton onClick={copy} className="h-11 px-5">
                        {copied ? <Check aria-hidden className="w-4 h-4" /> : <Copy aria-hidden className="w-4 h-4" />}
                        {copied ? 'Copiado' : 'Copiar prompt'}
                    </PrimaryButton>
                </>
            }
        >
            <div className="space-y-3">
                <p className="text-[13px] text-muted-foreground">
                    A arte pronta do Studio já é gratuita e instantânea. Use este prompt quando quiser um visual mais trabalhado: cole no Canva, numa IA de imagem, ou passe para um designer.
                </p>
                <pre className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground bg-foreground/[0.04] rounded-xl p-4 font-sans">{prompt}</pre>
            </div>
        </Sheet>
    )
}
