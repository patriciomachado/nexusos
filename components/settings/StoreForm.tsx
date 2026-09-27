'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { compressImage, extensionOf } from '@/lib/images/compress'
import { Chips, Field, Group, PrimaryButton, SwitchRow, TextArea, TextInput } from '@/components/ui/form'

export interface StoreFormCompany {
    id: string
    name: string | null
    cnpj: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip_code: string | null
    logo_url: string | null
    warranty_terms: string | null
    google_review_url: string | null
    cash_cycle: 'daily' | 'monthly' | null
    auto_close_cash: boolean | null
}

const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
const maskCnpj = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 14)
    if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

/** Store profile: what appears on OS, receipts, the tracking page and messages. */
export default function StoreForm({ company }: { company: StoreFormCompany }) {
    const router = useRouter()
    const [saving, startSaving] = useTransition()
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logo, setLogo] = useState(company.logo_url ?? '')
    const [form, setForm] = useState({
        name: company.name ?? '',
        cnpj: company.cnpj ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        address: company.address ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        zip_code: company.zip_code ?? '',
        warranty_terms: company.warranty_terms ?? '',
        google_review_url: company.google_review_url ?? '',
        cash_cycle: (company.cash_cycle ?? 'monthly') as 'daily' | 'monthly',
        auto_close_cash: company.auto_close_cash ?? true,
    })
    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(p => ({ ...p, [k]: v }))

    const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        setLogoFile(f)
        setLogo(URL.createObjectURL(f))
    }

    const save = () => {
        if (form.name.trim().length < 2) return toast.error('Informe o nome da loja.')
        if (form.google_review_url && !/^https?:\/\//.test(form.google_review_url)) return toast.error('O link de avaliação deve começar com https://')
        startSaving(async () => {
            let logo_url: string | null = logo ? company.logo_url : null
            if (logoFile) {
                try {
                    const file = await compressImage(logoFile, 'logo')
                    const path = `company-logos/company-${company.id}-logo-${Date.now()}.${extensionOf(file)}`
                    const { data, error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true, contentType: file.type })
                    if (error) throw error
                    logo_url = supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl
                } catch (err) {
                    return void toast.error(`Não foi possível enviar a logo: ${(err as Error).message}`)
                }
            }
            const res = await fetch(`/api/company/${company.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    name: form.name.trim(),
                    email: form.email.trim() || null,
                    state: form.state.trim().toUpperCase().slice(0, 2),
                    google_review_url: form.google_review_url.trim(),
                    logo_url,
                }),
            })
            if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                return void toast.error(typeof d.error === 'string' ? d.error : d.error?.email?._errors?.[0] ?? 'Não foi possível salvar')
            }
            setLogoFile(null)
            toast.success('Dados da loja salvos')
            router.refresh()
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center gap-2">
                <label className="relative cursor-pointer">
                    <input type="file" accept="image/*" className="sr-only" onChange={pickLogo} />
                    {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img width={96} height={96} src={logo} alt="Logo da loja" className="w-24 h-24 rounded-full object-contain bg-white border border-border/60" />
                    ) : (
                        <span className="w-24 h-24 rounded-full bg-primary/10 text-primary text-[34px] font-semibold flex items-center justify-center">{form.name.charAt(0).toUpperCase() || 'N'}</span>
                    )}
                    <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background"><Camera className="w-4 h-4" /></span>
                </label>
                {logo
                    ? <button type="button" onClick={() => { setLogo(''); setLogoFile(null) }} className="text-[15px] text-red-600">Tirar logo</button>
                    : <span className="text-[13px] text-muted-foreground">Toque para escolher a logo</span>}
            </div>

            <Group title="Loja">
                <Field label="Nome" htmlFor="st-name"><TextInput id="st-name" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
                <Field label="CNPJ ou CPF" htmlFor="st-cnpj"><TextInput id="st-cnpj" inputMode="numeric" value={form.cnpj} onChange={e => set('cnpj', maskCnpj(e.target.value))} placeholder="opcional" /></Field>
                <Field label="WhatsApp da loja" htmlFor="st-phone"><TextInput id="st-phone" type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(11) 98888-7777" /></Field>
                <Field label="E-mail" htmlFor="st-email"><TextInput id="st-email" type="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="opcional" /></Field>
            </Group>

            <Group title="Endereço">
                <Field label="Rua, número e bairro" htmlFor="st-addr"><TextInput id="st-addr" value={form.address} onChange={e => set('address', e.target.value)} /></Field>
                <div className="grid grid-cols-[1fr_72px_120px] divide-x divide-border/60">
                    <Field label="Cidade" htmlFor="st-city"><TextInput id="st-city" value={form.city} onChange={e => set('city', e.target.value)} /></Field>
                    <Field label="UF" htmlFor="st-uf"><TextInput id="st-uf" value={form.state} onChange={e => set('state', e.target.value.slice(0, 2))} /></Field>
                    <Field label="CEP" htmlFor="st-cep"><TextInput id="st-cep" inputMode="numeric" value={form.zip_code} onChange={e => set('zip_code', e.target.value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'))} /></Field>
                </div>
            </Group>

            <Group title="Garantia e avaliações" footer="Os termos de garantia aparecem na página de acompanhamento e no termo de garantia dos aparelhos.">
                <Field label="Termos de garantia" htmlFor="st-warranty"><TextArea id="st-warranty" rows={4} value={form.warranty_terms} onChange={e => set('warranty_terms', e.target.value)} placeholder="Ex.: A garantia cobre defeitos do serviço por 90 dias. Não cobre quedas, líquidos ou tela quebrada." /></Field>
                <Field label="Link de avaliação no Google" htmlFor="st-google" hint="Enviado a quem der 5 estrelas no pós-venda."><TextInput id="st-google" type="url" inputMode="url" value={form.google_review_url} onChange={e => set('google_review_url', e.target.value)} placeholder="https://g.page/r/..." /></Field>
            </Group>

            <Group title="Caixa" footer="Se alguém esquecer o caixa aberto, ele é fechado sozinho na virada do período.">
                <SwitchRow label="Fechar caixa esquecido" checked={form.auto_close_cash} onChange={v => set('auto_close_cash', v)} />
                {form.auto_close_cash && (
                    <div className="px-4 py-3">
                        <Chips ariaLabel="Período do caixa" value={form.cash_cycle} onChange={v => set('cash_cycle', v)} options={[{ value: 'daily', label: 'Todo dia' }, { value: 'monthly', label: 'Todo mês' }]} />
                    </div>
                )}
            </Group>

            <PrimaryButton onClick={save} disabled={saving} className="w-full">{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton>
        </div>
    )
}
