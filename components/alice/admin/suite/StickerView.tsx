'use client'

import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button, fieldCls, FieldRow, Notice, Panel } from './ui'

/** Figurinha: transforma uma imagem em sticker e envia para um número ou grupo (também funciona pelo comando #figurinha). */
export default function StickerView() {
    const input = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [to, setTo] = useState('')
    const [busy, setBusy] = useState(false)

    const pick = (f: File | null) => {
        if (preview) URL.revokeObjectURL(preview)
        setFile(f)
        setPreview(f ? URL.createObjectURL(f) : null)
    }

    const send = async () => {
        if (!file) return
        setBusy(true)
        try {
            const form = new FormData()
            form.set('file', file)
            form.set('to', to)
            const res = await fetch('/api/alice/sticker', { method: 'POST', body: form })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error ?? 'Não foi possível enviar.')
            toast.success('Figurinha enviada')
            pick(null)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
            if (input.current) input.current.value = ''
        }
    }

    return (
        <div className="space-y-4">
            <Notice>Ative o comando <b>#figurinha</b> em Configuração → Regras do WhatsApp para a equipe criar figurinhas direto no WhatsApp: mande uma foto com essa legenda.</Notice>
            <Panel title="Criar figurinha" description="A imagem vira uma figurinha 512×512 com fundo transparente.">
                <div className="px-5 pb-5 space-y-4">
                    <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => pick(e.target.files?.[0] ?? null)} />
                    <button type="button" onClick={() => input.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-border h-44 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-foreground/[0.03]">
                        {preview
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={preview} alt="Prévia" className="max-h-36 rounded-lg" />
                            : <><ImagePlus className="w-7 h-7" /><span className="text-[14px]">Escolher imagem (até 5 MB)</span></>}
                    </button>
                    <FieldRow label="Enviar para (WhatsApp com DDD)"><input value={to} onChange={e => setTo(e.target.value)} inputMode="tel" placeholder="48 99999-9999" className={fieldCls} /></FieldRow>
                    <Button busy={busy} disabled={!file || to.replace(/\D/g, '').length < 10} onClick={send} className="w-full h-12 text-[17px]">Enviar figurinha</Button>
                </div>
            </Panel>
        </div>
    )
}
