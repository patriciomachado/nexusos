'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Camera, Check, ChevronLeft, ClipboardList, Loader2, MapPin, Package, ShieldCheck, Star, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { compressImage, extensionOf } from '@/lib/images/compress'
import { Field, Group, PrimaryButton, TextArea, TextInput } from '@/components/ui/form'

export interface SetupCompany {
    id: string
    name: string
    phone: string | null
    cnpj: string | null
    logo_url: string | null
    zip_code: string | null
    address: string | null
    city: string | null
    state: string | null
    warranty_terms: string | null
    google_review_url: string | null
}

const DEFAULT_WARRANTY = 'Garantia de 90 dias para o serviço e as peças trocadas. Não cobre mau uso, quedas, contato com líquidos ou violação do lacre.'

const digits = (s: string) => s.replace(/\D/g, '')
function maskPhone(v: string) {
    const n = digits(v).slice(0, 11)
    if (n.length <= 2) return n
    if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`
    if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}
function maskCep(v: string) {
    const n = digits(v).slice(0, 8)
    return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n
}
function maskCnpj(v: string) {
    const n = digits(v).slice(0, 14)
    return n
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
}

const STEPS = ['Sua loja', 'Endereço', 'Garantia e avaliações'] as const

/**
 * First-run setup for a new store, full screen like the iPhone setup
 * assistant. Each step saves as you go; "Agora não" records that it was
 * skipped, so it never comes back (everything stays editable in Ajustes).
 */
export default function SetupAssistant({ company }: { company: SetupCompany }) {
    const router = useRouter()
    const [open, setOpen] = useState(true)
    const [step, setStep] = useState(-1) // -1 welcome, 0..2 form steps, 3 done
    const [busy, setBusy] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [cepLoading, setCepLoading] = useState(false)
    const [v, setV] = useState({
        name: company.name ?? '',
        phone: maskPhone(company.phone ?? ''),
        cnpj: maskCnpj(company.cnpj ?? ''),
        logo_url: company.logo_url ?? '',
        zip_code: maskCep(company.zip_code ?? ''),
        address: company.address ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        warranty_terms: company.warranty_terms || DEFAULT_WARRANTY,
        google_review_url: company.google_review_url ?? '',
    })
    const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV(p => ({ ...p, [k]: value }))

    // Keep the page behind from scrolling while the assistant is open.
    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [open])

    const post = async (payload: unknown) => {
        const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Não foi possível salvar')
    }

    const finish = async (goTo?: string) => {
        setBusy(true)
        try {
            await post({ action: 'finish' })
            setOpen(false)
            router.replace(goTo ?? '/dashboard')
            router.refresh()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const saveStep = async () => {
        const fields = step === 0
            ? { name: v.name.trim(), phone: v.phone || null, cnpj: v.cnpj || null, logo_url: v.logo_url || null }
            : step === 1
                ? { zip_code: v.zip_code || null, address: v.address || null, city: v.city || null, state: v.state.toUpperCase() || null }
                : { warranty_terms: v.warranty_terms || null, google_review_url: v.google_review_url || null }
        if (step === 0 && v.name.trim().length < 2) return toast.error('Informe o nome da loja')
        setBusy(true)
        try {
            await post({ action: 'save', company: fields })
            if (step === 2) await post({ action: 'finish' })
            setStep(s => s + 1)
            document.getElementById('setup-scroll')?.scrollTo({ top: 0 })
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const uploadLogo = async (file: File | null) => {
        if (!file) return
        setUploading(true)
        try {
            const logo = await compressImage(file, 'logo')
            const path = `company-logos/company-${company.id}-logo-${Date.now()}.${extensionOf(logo)}`
            const { data, error } = await supabase.storage.from('product-images').upload(path, logo, { upsert: true, contentType: logo.type })
            if (error) throw error
            set('logo_url', supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl)
        } catch {
            toast.error('Não foi possível enviar a logo')
        } finally {
            setUploading(false)
        }
    }

    const lookupCep = async (cep: string) => {
        if (digits(cep).length !== 8) return
        setCepLoading(true)
        try {
            const res = await fetch(`https://viacep.com.br/ws/${digits(cep)}/json/`)
            const data = await res.json()
            if (data && !data.erro) {
                setV(p => ({
                    ...p,
                    address: p.address || [data.logradouro, data.bairro].filter(Boolean).join(', '),
                    city: data.localidade || p.city,
                    state: data.uf || p.state,
                }))
            }
        } catch { /* fill by hand */ } finally {
            setCepLoading(false)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 ios-fill z-[950] bg-background flex flex-col animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Configurar a loja">
            {/* Top bar */}
            <div className="shrink-0 pt-[env(safe-area-inset-top)] border-b border-border/60 material-bar">
                <div className="max-w-xl mx-auto h-14 px-4 flex items-center gap-3">
                    {step > 0 && step < 3 ? (
                        <button type="button" onClick={() => setStep(s => s - 1)} className="h-10 -ml-2 pr-2 inline-flex items-center text-[17px] text-primary">
                            <ChevronLeft className="w-5 h-5" /> Voltar
                        </button>
                    ) : <span className="w-16" />}
                    <div className="flex-1 flex justify-center gap-1.5" aria-hidden={step < 0 || step > 2}>
                        {step >= 0 && step < 3 && STEPS.map((s, i) => (
                            <span key={s} className={cn('h-1.5 w-8 rounded-full', i <= step ? 'bg-primary' : 'bg-foreground/[0.1]')} />
                        ))}
                    </div>
                    {step < 3 ? (
                        <button type="button" onClick={() => finish()} disabled={busy} className="h-10 text-[17px] text-primary disabled:opacity-50">Agora não</button>
                    ) : <span className="w-16" />}
                </div>
            </div>

            {/* Content */}
            <div id="setup-scroll" className="flex-1 overflow-y-auto overscroll-contain">
                <div className="max-w-xl mx-auto px-4 py-8">
                    {step === -1 && (
                        <div className="text-center pt-6">
                            <div className="w-20 h-20 rounded-[22px] bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
                                <Building2 className="w-10 h-10" />
                            </div>
                            <h1 className="mt-6 text-[34px] leading-tight font-semibold tracking-tight">Vamos deixar sua loja pronta</h1>
                            <p className="mt-3 text-[17px] text-muted-foreground">Leva uns 2 minutos. Essas informações aparecem nas OS, nos comprovantes e no link que o cliente recebe.</p>
                            <ul className="mt-8 text-left rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                                {[
                                    { icon: Building2, t: 'Nome, WhatsApp e logo', d: 'Como seus clientes reconhecem a loja' },
                                    { icon: MapPin, t: 'Endereço', d: 'Sai impresso no comprovante da OS' },
                                    { icon: ShieldCheck, t: 'Garantia e avaliações', d: 'Termos da garantia e link do Google' },
                                ].map(i => (
                                    <li key={i.t} className="flex items-center gap-3 px-4 py-3">
                                        <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><i.icon className="w-5 h-5" /></span>
                                        <span className="min-w-0">
                                            <span className="block text-[17px]">{i.t}</span>
                                            <span className="block text-[13px] text-muted-foreground">{i.d}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {step === 0 && (
                        <div className="space-y-6">
                            <header>
                                <p className="text-[13px] font-medium text-muted-foreground">Passo 1 de 3</p>
                                <h2 className="text-[28px] leading-tight font-semibold tracking-tight">Sua loja</h2>
                            </header>
                            <div className="flex items-center gap-4 px-1">
                                <label className="relative w-20 h-20 rounded-2xl bg-card border border-border/60 overflow-hidden flex items-center justify-center cursor-pointer shrink-0">
                                    {v.logo_url
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img width={400} height={400} src={v.logo_url} alt="Logo da loja" className="w-full h-full object-contain p-1.5" />
                                        : uploading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
                                    <input type="file" accept="image/*" className="sr-only" onChange={e => uploadLogo(e.target.files?.[0] ?? null)} aria-label="Enviar logo" />
                                </label>
                                <div className="min-w-0">
                                    <p className="text-[17px]">Logo</p>
                                    <p className="text-[13px] text-muted-foreground">Toque no quadrado para escolher uma imagem.</p>
                                    {v.logo_url && (
                                        <button type="button" onClick={() => set('logo_url', '')} className="mt-1 text-[15px] text-red-600 dark:text-red-400 inline-flex items-center gap-1"><X className="w-4 h-4" /> Remover</button>
                                    )}
                                </div>
                            </div>
                            <Group>
                                <Field label="Nome da loja" htmlFor="setup-name">
                                    <TextInput id="setup-name" value={v.name} onChange={e => set('name', e.target.value)} placeholder="Ex.: Support Store" autoCapitalize="words" />
                                </Field>
                                <Field label="WhatsApp da loja" htmlFor="setup-phone">
                                    <TextInput id="setup-phone" value={v.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" />
                                </Field>
                                <Field label="CNPJ (opcional)" htmlFor="setup-cnpj">
                                    <TextInput id="setup-cnpj" value={v.cnpj} onChange={e => set('cnpj', maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" />
                                </Field>
                            </Group>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6">
                            <header>
                                <p className="text-[13px] font-medium text-muted-foreground">Passo 2 de 3</p>
                                <h2 className="text-[28px] leading-tight font-semibold tracking-tight">Endereço</h2>
                                <p className="text-[15px] text-muted-foreground">Digite o CEP que o resto a gente completa.</p>
                            </header>
                            <Group>
                                <Field label="CEP" htmlFor="setup-cep">
                                    <div className="flex items-center gap-2">
                                        <TextInput id="setup-cep" value={v.zip_code} onChange={e => { const m = maskCep(e.target.value); set('zip_code', m); lookupCep(m) }} placeholder="00000-000" inputMode="numeric" autoComplete="postal-code" />
                                        {cepLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />}
                                    </div>
                                </Field>
                                <Field label="Rua, número e bairro" htmlFor="setup-address">
                                    <TextInput id="setup-address" value={v.address} onChange={e => set('address', e.target.value)} placeholder="Ex.: Rua das Flores, 120, Centro" autoComplete="street-address" />
                                </Field>
                                <div className="grid grid-cols-[1fr_88px] divide-x divide-border/60">
                                    <Field label="Cidade" htmlFor="setup-city">
                                        <TextInput id="setup-city" value={v.city} onChange={e => set('city', e.target.value)} autoComplete="address-level2" />
                                    </Field>
                                    <Field label="UF" htmlFor="setup-uf">
                                        <TextInput id="setup-uf" value={v.state} onChange={e => set('state', e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase())} placeholder="SC" autoCapitalize="characters" />
                                    </Field>
                                </div>
                            </Group>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <header>
                                <p className="text-[13px] font-medium text-muted-foreground">Passo 3 de 3</p>
                                <h2 className="text-[28px] leading-tight font-semibold tracking-tight">Garantia e avaliações</h2>
                            </header>
                            <Group title="Termos de garantia" footer="Aparecem no comprovante da OS. Pode ajustar quando quiser.">
                                <Field label="Texto" htmlFor="setup-warranty">
                                    <TextArea id="setup-warranty" value={v.warranty_terms} onChange={e => set('warranty_terms', e.target.value)} rows={4} />
                                </Field>
                            </Group>
                            <Group title="Avaliações no Google" footer="Opcional. O pós-venda usa esse link para pedir avaliação aos clientes satisfeitos.">
                                <Field label="Link para avaliar a loja" htmlFor="setup-google">
                                    <div className="flex items-center gap-2">
                                        <Star className="w-5 h-5 text-amber-500 shrink-0" />
                                        <TextInput id="setup-google" value={v.google_review_url} onChange={e => set('google_review_url', e.target.value.trim())} placeholder="https://g.page/r/…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                                    </div>
                                </Field>
                            </Group>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center pt-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                                <Check className="w-9 h-9" strokeWidth={3} />
                            </div>
                            <h2 className="mt-5 text-[28px] font-semibold tracking-tight">Tudo pronto</h2>
                            <p className="mt-2 text-[17px] text-muted-foreground">Por onde quer começar?</p>
                            <div className="mt-8 text-left rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                                {[
                                    { href: '/service-orders/new', icon: ClipboardList, t: 'Abrir a primeira OS' },
                                    { href: '/inventory', icon: Package, t: 'Cadastrar produtos e peças' },
                                    { href: '/team', icon: Users, t: 'Adicionar a equipe' },
                                ].map(a => (
                                    <Link key={a.href} href={a.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px]">
                                        <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><a.icon className="w-5 h-5" /></span>
                                        <span className="flex-1 text-[17px]">{a.t}</span>
                                        <ChevronLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom bar */}
            <div className="shrink-0 border-t border-border/60 material-bar" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                <div className="max-w-xl mx-auto px-4 pt-3 flex gap-3">
                    {step === -1 && <PrimaryButton onClick={() => setStep(0)} className="flex-1">Começar</PrimaryButton>}
                    {step >= 0 && step < 3 && (
                        <>
                            <PrimaryButton onClick={saveStep} disabled={busy || uploading} className="flex-1">
                                {busy && <Loader2 className="w-5 h-5 animate-spin" />}
                                {step === 2 ? 'Concluir' : 'Continuar'}
                            </PrimaryButton>
                        </>
                    )}
                    {step === 3 && <PrimaryButton onClick={() => { setOpen(false); router.replace('/dashboard'); router.refresh() }} className="flex-1">Ir para o painel</PrimaryButton>}
                </div>
            </div>
        </div>
    )
}
