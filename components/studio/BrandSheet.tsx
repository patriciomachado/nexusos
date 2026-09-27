'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Field, Group, PrimaryButton, TextInput } from '@/components/ui/form'
import type { Brand } from '@/lib/studio/brand'

/** Brand kit: what goes on every art and ready-made text. */
export default function BrandSheet({ open, onClose, brand, canEdit, onSaved }: {
    open: boolean
    onClose: () => void
    brand: Brand
    canEdit: boolean
    onSaved: (brand: Brand) => void
}) {
    const [form, setForm] = useState(brand)
    const [saving, setSaving] = useState(false)
    const set = (patch: Partial<Brand>) => setForm(f => ({ ...f, ...patch }))

    const save = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/studio/brand', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
            onSaved(data as Brand)
            toast.success('Marca atualizada')
            onClose()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Marca da loja"
            subtitle="Vai em todas as artes e textos prontos"
            footer={canEdit ? (
                <PrimaryButton onClick={save} disabled={saving} className="w-full">
                    {saving && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />} Salvar marca
                </PrimaryButton>
            ) : undefined}
        >
            <div className="space-y-5">
                <Group footer={<>O logo vem do cadastro da loja. <Link href="/settings" className="text-primary">Trocar em Configurações</Link></>}>
                    <div className="flex items-center gap-3 px-4 py-3">
                        {brand.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brand.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain bg-white border border-border/60" />
                        ) : (
                            <span className="w-12 h-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center text-[12px] text-muted-foreground">Logo</span>
                        )}
                        <span className="text-[15px] text-muted-foreground">{brand.logoUrl ? 'Logo da loja' : 'Sem logo cadastrado'}</span>
                    </div>
                </Group>

                <Group>
                    <Field label="Nome nas artes" htmlFor="brand-name"><TextInput id="brand-name" value={form.name} onChange={e => set({ name: e.target.value })} maxLength={60} disabled={!canEdit} /></Field>
                    <Field label="Slogan" htmlFor="brand-tagline"><TextInput id="brand-tagline" value={form.tagline} onChange={e => set({ tagline: e.target.value })} maxLength={80} placeholder="Ex.: Conserto com garantia" disabled={!canEdit} /></Field>
                    <Field label="WhatsApp" htmlFor="brand-wa"><TextInput id="brand-wa" type="tel" value={form.whatsapp} onChange={e => set({ whatsapp: e.target.value })} maxLength={30} disabled={!canEdit} /></Field>
                    <Field label="Cidade" htmlFor="brand-city"><TextInput id="brand-city" value={form.city} onChange={e => set({ city: e.target.value })} maxLength={60} disabled={!canEdit} /></Field>
                    <Field label="Instagram" htmlFor="brand-ig"><TextInput id="brand-ig" value={form.instagram} onChange={e => set({ instagram: e.target.value.replace(/^@+/, '') })} maxLength={40} placeholder="sualoja" disabled={!canEdit} /></Field>
                </Group>

                <Group title="Cores">
                    {([['primary', 'Cor principal'], ['secondary', 'Cor de destaque']] as const).map(([k, label]) => (
                        <label key={k} className="flex items-center gap-3 px-4 min-h-[52px] cursor-pointer">
                            <span className="flex-1 text-[17px]">{label}</span>
                            <span className="text-[15px] text-muted-foreground tabular-nums uppercase">{form[k]}</span>
                            <input type="color" value={form[k]} onChange={e => set({ [k]: e.target.value.toUpperCase() })} disabled={!canEdit} className="w-10 h-10 rounded-full border border-border/60 bg-transparent cursor-pointer" aria-label={label} />
                        </label>
                    ))}
                </Group>

                {!canEdit && <p className="text-[13px] text-muted-foreground px-1">Só o dono e gerentes alteram a marca.</p>}
            </div>
        </Sheet>
    )
}
