'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Building2, MapPin, Mail, Phone, Hash, ShieldCheck, Sparkles, Loader2, DollarSign, Image as ImageIcon, Upload, X, Globe } from 'lucide-react'
import { PremiumInput } from '@/components/ui/PremiumInput'
import { PremiumTextarea } from '@/components/ui/PremiumTextarea'
import { supabase } from '@/lib/supabase'

interface Props {
    company: any
    companyId: string
}

export default function CompanySettingsForm({ company, companyId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [logo, setLogo] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState(company?.logo_url || '')
    const [isUploading, setIsUploading] = useState(false)
    const [form, setForm] = useState({
        name: company?.name || '',
        cnpj: company?.cnpj || '',
        email: company?.email || '',
        phone: company?.phone || '',
        address: company?.address || '',
        city: company?.city || '',
        state: company?.state || '',
        zip_code: company?.zip_code || '',
        warranty_terms: company?.warranty_terms || '',
        cash_cycle: company?.cash_cycle || 'monthly',
        auto_close_cash: company?.auto_close_cash ?? true,
        google_review_url: company?.google_review_url || '',
    })

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogo(file)
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const removeLogo = () => {
        setLogo(null)
        setLogoPreview('')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            let finalLogoUrl = logoPreview === company?.logo_url ? company?.logo_url : null
            
            if (logo) {
                setIsUploading(true)
                try {
                    const fileExt = logo.name.split('.').pop()
                    const fileName = `company-${companyId}-logo.${fileExt}`
                    const filePath = `company-logos/${fileName}`

                    const { data, error } = await supabase.storage
                        .from('product-images')
                        .upload(filePath, logo, { upsert: true })

                    if (error) throw error

                    const { data: { publicUrl } } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(data.path)

                    finalLogoUrl = publicUrl
                } catch (err: any) {
                    toast.error('Erro no upload da logo: ' + err.message)
                    setIsUploading(false)
                    return
                }
                setIsUploading(false)
            }

            const res = await fetch(`/api/company/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, logo_url: finalLogoUrl }),
            })
            if (res.ok) {
                toast.success('Perfil da empresa atualizado!')
                router.refresh()
            } else {
                toast.error('Ocorreu um erro ao salvar')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-12 animate-in fade-in duration-700">
            <div className="grid sm:grid-cols-2 gap-10">
                <div className="sm:col-span-2">
                    <label className="block text-[13px] font-medium text-primary mb-3 ml-2">Logo da Empresa</label>
                    <div className="flex items-center gap-6 p-6 rounded-2xl border border-dashed border-border bg-card/30">
                        {logoPreview ? (
                            <div className="relative group">
                                <img src={logoPreview} alt="Logo" className="w-32 h-32 object-contain rounded-2xl bg-white p-2" />
                                <button
                                    type="button"
                                    onClick={removeLogo}
                                    className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
                                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">Clique ou arraste a imagem</span>
                                <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 2MB</span>
                            </label>
                        )}
                    </div>
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-[13px] font-medium text-primary mb-3 ml-2">Entidade Jurídica / Nome</label>
                    <PremiumInput
                        name="name"
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        required
                        icon={<Building2 className="w-4 h-4" />}
                        placeholder="Nexus OS Enterprise Solutions"
                    />
                </div>

                <div>
                    <label className="block text-[13px] font-medium text-muted-foreground mb-3 ml-2">Registro Fiscal (CNPJ/CPF)</label>
                    <PremiumInput
                        name="cnpj"
                        value={form.cnpj}
                        onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                        icon={<Hash className="w-4 h-4" />}
                        placeholder="00.000.000/0001-00"
                    />
                </div>

                <div>
                    <label className="block text-[13px] font-medium text-muted-foreground mb-3 ml-2">E-mail para Recibos</label>
                    <PremiumInput
                        name="email"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        icon={<Mail className="w-4 h-4" />}
                        placeholder="contato@empresa.com.br"
                    />
                </div>

                <div>
                    <label className="block text-[13px] font-medium text-muted-foreground mb-3 ml-2">Telefone</label>
                    <PremiumInput
                        name="phone"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        icon={<Phone className="w-4 h-4" />}
                        placeholder="(00) 00000-0000"
                    />
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-[13px] font-medium text-muted-foreground mb-3 ml-2">Endereço</label>
                    <PremiumInput
                        name="address"
                        value={form.address}
                        onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                        icon={<MapPin className="w-4 h-4" />}
                        placeholder="Rua Example, 123"
                    />
                </div>

                <div>
                    <label className="block text-[13px] font-medium text-muted-foreground mb-3 ml-2">Cidade</label>
                    <PremiumInput
                        name="city"
                        value={form.city}
                        onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                        icon={<MapPin className="w-4 h-4" />}
                        placeholder="São Paulo"
                    />
                </div>

                <div>
                    <label className="block text-[13px] font-medium text-muted-foreground mb-3 ml-2">Estado</label>
                    <PremiumInput
                        name="state"
                        value={form.state}
                        onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                        icon={<MapPin className="w-4 h-4" />}
                        placeholder="SP"
                    />
                </div>

                <div>
                    <label className="block text-[13px] font-medium text-muted-foreground mb-3 ml-2">CEP</label>
                    <PremiumInput
                        name="zip_code"
                        value={form.zip_code}
                        onChange={e => setForm(p => ({ ...p, zip_code: e.target.value }))}
                        icon={<Hash className="w-4 h-4" />}
                        placeholder="00000-000"
                    />
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-[13px] font-medium text-primary mb-3 ml-2">Link de Avaliação do Google (Google Reviews)</label>
                    <PremiumInput
                        name="google_review_url"
                        value={form.google_review_url}
                        onChange={e => setForm(p => ({ ...p, google_review_url: e.target.value }))}
                        icon={<Globe className="w-4 h-4" />}
                        placeholder="https://g.page/r/YOUR_BUSINESS_ID/review"
                    />
                    <p className="text-xs text-muted-foreground mt-2 ml-2">
                        Insira a URL direta do seu perfil do Google para redirecionar clientes satisfeitos (que avaliarem com 4 ou 5 estrelas).
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-border">
                <div className="flex items-center gap-3">
                    <input 
                        type="checkbox" 
                        id="auto_close_cash"
                        checked={form.auto_close_cash}
                        onChange={e => setForm(p => ({ ...p, auto_close_cash: e.target.checked }))}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20" 
                    />
                    <label htmlFor="auto_close_cash" className="text-sm font-medium text-muted-foreground">Fechamento automático do caixa</label>
                </div>
                <button
                    type="submit"
                    disabled={isPending || isUploading}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending || isUploading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Salvar Alterações
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}