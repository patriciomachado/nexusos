'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, Printer } from 'lucide-react'
import { Field, Group, PrimaryButton, SwitchRow, TextArea, TextInput } from '@/components/ui/form'
import Segmented from '@/components/ui/Segmented'
import { DOCUMENT_COLORS, type DocumentSettings } from '@/lib/settings/documents'
import { cn } from '@/lib/utils'

interface Store { name: string; logo_url: string | null; phone: string | null; city: string | null }

/** Receipt and OS look, with a live preview of both. */
export default function DocumentsForm({ initial, store }: { initial: DocumentSettings; store: Store }) {
    const [doc, setDoc] = useState(initial)
    const [preview, setPreview] = useState<'os' | 'receipt'>('os')
    const [saving, setSaving] = useState(false)
    const set = <K extends keyof DocumentSettings>(k: K, v: DocumentSettings[K]) => setDoc(p => ({ ...p, [k]: v }))

    const save = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/settings/documents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) })
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Não foi possível salvar')
            setDoc(await res.json())
            toast.success('Recibo e OS atualizados')
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Segmented ariaLabel="Pré-visualizar" value={preview} onChange={setPreview} options={[{ value: 'os', label: 'OS (A4)' }, { value: 'receipt', label: 'Recibo' }]} />
                <div className="rounded-2xl bg-foreground/[0.04] p-4 flex justify-center">
                    {preview === 'os' ? <OSPreview doc={doc} store={store} /> : <ReceiptPreview doc={doc} store={store} />}
                </div>
            </div>

            <Group title="Aparência">
                <div className="px-4 py-3">
                    <p className="text-[13px] text-muted-foreground mb-2">Cor dos títulos e bordas</p>
                    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Cor">
                        {DOCUMENT_COLORS.map(c => (
                            <button key={c} type="button" role="radio" aria-checked={doc.accent === c} aria-label={c} onClick={() => set('accent', c)}
                                className={cn('w-9 h-9 rounded-full flex items-center justify-center ring-offset-2 ring-offset-card', doc.accent === c && 'ring-2 ring-primary')} style={{ background: c }}>
                                {doc.accent === c && <Check className="w-4 h-4 text-white" />}
                            </button>
                        ))}
                    </div>
                </div>
                <SwitchRow label="Mostrar a logo" description={store.logo_url ? undefined : 'Sem logo, aparece a inicial da loja. Envie a logo em Dados da loja.'} checked={doc.show_logo} onChange={v => set('show_logo', v)} />
                <Field label="Frase abaixo do nome" htmlFor="doc-tag"><TextInput id="doc-tag" maxLength={80} value={doc.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Ex.: Assistência técnica especializada" /></Field>
            </Group>

            <Group title="Recibo de venda">
                <Field label="Mensagem no final" htmlFor="doc-footer" hint="Também vai no recibo enviado pelo WhatsApp."><TextArea id="doc-footer" rows={2} maxLength={400} value={doc.receipt_footer} onChange={e => set('receipt_footer', e.target.value)} placeholder="Obrigado pela preferência! Trocas em até 7 dias com este recibo." /></Field>
            </Group>

            <Group title="Ordem de serviço">
                <Field label="Termos impressos" htmlFor="doc-terms" hint="Se deixar em branco, sai o prazo de garantia da OS."><TextArea id="doc-terms" rows={4} maxLength={1500} value={doc.os_terms} onChange={e => set('os_terms', e.target.value)} placeholder="Ex.: Garantia de 90 dias para o serviço executado. Não cobre quedas, líquidos ou mau uso." /></Field>
                <Field label="Prazo para retirar o aparelho (dias)" htmlFor="doc-days" hint="0 tira o aviso da OS.">
                    <TextInput id="doc-days" inputMode="numeric" value={String(doc.abandon_days)} onChange={e => set('abandon_days', Math.min(Number(e.target.value.replace(/\D/g, '')) || 0, 365))} />
                </Field>
                <SwitchRow label="Link de acompanhamento" description="Endereço para o cliente ver a OS pela internet" checked={doc.show_tracking} onChange={v => set('show_tracking', v)} />
                <SwitchRow label="Assinatura do técnico" checked={doc.show_tech_signature} onChange={v => set('show_tech_signature', v)} />
            </Group>

            <PrimaryButton onClick={save} disabled={saving} className="w-full">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}Salvar</PrimaryButton>
        </div>
    )
}

function Logo({ doc, store, size }: { doc: DocumentSettings; store: Store; size: number }) {
    if (!doc.show_logo) return null
    // eslint-disable-next-line @next/next/no-img-element
    if (store.logo_url) return <img src={store.logo_url} alt="" style={{ width: size, height: size }} className="object-contain" />
    return <span style={{ width: size, height: size, background: doc.accent }} className="rounded-md text-white font-bold flex items-center justify-center text-[12px]">{store.name.charAt(0).toUpperCase()}</span>
}

function OSPreview({ doc, store }: { doc: DocumentSettings; store: Store }) {
    return (
        <div className="w-full max-w-[320px] bg-white text-black rounded shadow-sm p-4 text-[7px] leading-tight overflow-hidden">
            <div className="flex justify-between items-start border-b-2 pb-2 mb-2" style={{ borderColor: doc.accent }}>
                <div className="flex gap-1.5 items-center">
                    <Logo doc={doc} store={store} size={24} />
                    <div>
                        <p className="font-bold text-[9px]">{store.name}</p>
                        {doc.tagline && <p style={{ color: doc.accent }}>{doc.tagline}</p>}
                        <p className="text-gray-600">{[store.phone, store.city].filter(Boolean).join(' · ')}</p>
                    </div>
                </div>
                <div className="text-right"><p className="text-gray-500 uppercase">Ordem de serviço</p><p className="font-black text-[12px]" style={{ color: doc.accent }}>OS-0142</p></div>
            </div>
            {['Cliente', 'Aparelho e defeito'].map(t => (
                <div key={t} className="rounded border p-1.5 mb-1.5" style={{ borderColor: doc.accent }}>
                    <p className="font-bold uppercase mb-1" style={{ color: doc.accent }}>{t}</p>
                    <div className="h-1 bg-gray-200 rounded w-3/4 mb-0.5" /><div className="h-1 bg-gray-200 rounded w-1/2" />
                </div>
            ))}
            <div className="text-white px-1.5 py-0.5 mb-1" style={{ background: doc.accent }}>Item / serviço</div>
            <div className="h-1 bg-gray-200 rounded w-full mb-2" />
            <div className="flex gap-2">
                <div className="flex-1 text-gray-600">
                    <p className="font-bold uppercase" style={{ color: doc.accent }}>Termos</p>
                    <p className="line-clamp-3">{doc.os_terms || 'Garantia de 3 meses para o serviço executado, a partir da data de entrega.'}</p>
                    {doc.abandon_days > 0 && <p>Aparelhos não retirados em até {doc.abandon_days} dias…</p>}
                </div>
                <div className="w-[38%] border rounded p-1 font-black" style={{ borderColor: doc.accent }}>TOTAL R$ 350,00</div>
            </div>
            <div className={cn('grid gap-4 mt-5', doc.show_tech_signature ? 'grid-cols-2' : 'grid-cols-1 w-1/2 mx-auto')}>
                {doc.show_tech_signature && <p className="border-t border-black text-center pt-0.5">Técnico</p>}
                <p className="border-t border-black text-center pt-0.5">Cliente</p>
            </div>
            {doc.show_tracking && <p className="text-center text-gray-500 mt-3 border-t border-dashed pt-1">Acompanhe sua OS pela internet</p>}
        </div>
    )
}

function ReceiptPreview({ doc, store }: { doc: DocumentSettings; store: Store }) {
    return (
        <div className="w-[230px] bg-white text-black rounded shadow-sm p-3 font-mono text-[10px] leading-snug">
            <div className="text-center flex flex-col items-center">
                <Logo doc={doc} store={store} size={28} />
                <p className="font-bold text-[11px] mt-1">{store.name}</p>
                {doc.tagline && <p>{doc.tagline}</p>}
                {store.phone && <p>{store.phone}</p>}
            </div>
            <hr className="my-2 border-dashed border-black/40" />
            <p className="flex justify-between"><span>1 × Película 3D</span><span>R$ 40,00</span></p>
            <p className="flex justify-between"><span>1 × Capinha</span><span>R$ 35,00</span></p>
            <hr className="my-2 border-dashed border-black/40" />
            <p className="flex justify-between font-bold"><span>TOTAL</span><span>R$ 75,00</span></p>
            <p className="flex justify-between"><span>Pix</span><span>R$ 75,00</span></p>
            <hr className="my-2 border-dashed border-black/40" />
            <p className="text-center whitespace-pre-line">{doc.receipt_footer || 'Obrigado pela preferência!'}</p>
        </div>
    )
}
