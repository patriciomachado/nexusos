'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, ExternalLink } from 'lucide-react'
import Segmented from '@/components/ui/Segmented'
import { PrimaryButton } from '@/components/ui/form'

type Kind = 'imagem' | 'video'

/** The card is gone: this is what Studio hands the user now — a prompt to paste into an image or video AI. */
export default function PromptPanel({ imagePrompt, videoPrompt }: { imagePrompt: string; videoPrompt: string }) {
    const [kind, setKind] = useState<Kind>('imagem')
    const [copied, setCopied] = useState(false)
    const prompt = kind === 'imagem' ? imagePrompt : videoPrompt

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
        <div className="space-y-3">
            <Segmented
                ariaLabel="Tipo de prompt"
                value={kind}
                onChange={setKind}
                options={[{ value: 'imagem', label: 'Prompt de imagem' }, { value: 'video', label: 'Prompt de vídeo' }]}
            />
            <pre className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground bg-foreground/[0.04] rounded-2xl p-4 font-sans max-h-[40dvh] overflow-y-auto">{prompt}</pre>
            <div className="flex flex-wrap items-center gap-2">
                <PrimaryButton onClick={copy} className="h-11 px-5 text-[15px]">
                    {copied ? <Check aria-hidden className="w-4 h-4" /> : <Copy aria-hidden className="w-4 h-4" />}
                    {copied ? 'Copiado' : 'Copiar prompt'}
                </PrimaryButton>
                {kind === 'imagem' && (
                    <a href="https://www.canva.com/" target="_blank" rel="noreferrer" className="h-11 px-4 rounded-full text-[15px] text-primary hover:bg-foreground/[0.05] inline-flex items-center gap-1.5">
                        <ExternalLink aria-hidden className="w-4 h-4" /> Abrir Canva
                    </a>
                )}
            </div>
            <p className="text-[13px] text-muted-foreground px-1">
                {kind === 'imagem'
                    ? 'Cole no Canva, ChatGPT, Midjourney ou outra IA de imagem.'
                    : 'Cole no Sora, Runway, Kling ou outra IA de vídeo.'}
            </p>
        </div>
    )
}
