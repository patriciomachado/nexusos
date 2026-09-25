'use client'

import { useState, useEffect } from 'react'
import { Sparkles, ArrowRight, ShieldCheck, Check, Camera, Link as LinkIcon, Building2, Smartphone, MapPin, Globe, Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { compressImage, extensionOf } from '@/lib/images/compress'

interface DashboardOnboardingProps {
    companyId: string
    companyName: string
    onComplete: () => void
}

export default function DashboardOnboarding({ companyId, companyName, onComplete }: DashboardOnboardingProps) {
    const [step, setStep] = useState(1) // 1: Welcome, 2: Company Info, 3: Address & Settings, 4: Logo & Google Review, 5: First OS Setup, 6: Done
    const [companyDetails, setCompanyDetails] = useState({
        name: companyName || '',
        cnpj: '',
        phone: '',
        segment: 'Assistência Técnica de Celulares',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        logo_url: '',
        google_review_url: '',
        warranty_terms: 'Garantia de 90 dias para defeitos de fabricação em peças substituídas. Não cobre danos por mau uso, quedas ou líquidos.'
    })
    const [osDetails, setOsDetails] = useState({
        customerName: '',
        customerPhone: '',
        equipment: '',
        defect: ''
    })
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState('')
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [saving, setSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Load existing company details if present in the database to prevent overwriting with null
    useEffect(() => {
        async function loadCompanyDetails() {
            try {
                const res = await fetch(`/api/company/${companyId}`)
                if (res.ok) {
                    const data = await res.json()
                    setCompanyDetails(prev => ({
                        ...prev,
                        name: data.name || prev.name,
                        cnpj: data.cnpj ? formatCNPJ(data.cnpj) : '',
                        phone: data.phone ? formatPhone(data.phone) : '',
                        address: data.address || '',
                        city: data.city || '',
                        state: data.state || '',
                        zip_code: data.zip_code ? formatCEP(data.zip_code) : '',
                        logo_url: data.logo_url || '',
                        google_review_url: data.google_review_url || '',
                        warranty_terms: data.warranty_terms || prev.warranty_terms
                    }))
                    if (data.logo_url) {
                        setLogoPreview(data.logo_url)
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar dados da empresa para onboarding:', err)
            }
        }
        loadCompanyDetails()
    }, [companyId])

    const formatCNPJ = (value: string) => {
        const numbers = value.replace(/\D/g, '').slice(0, 14)
        if (numbers.length <= 2) return numbers
        if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
        if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
        if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
        return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`
    }

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '').slice(0, 11)
        if (numbers.length <= 2) return numbers
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
    }

    const formatCEP = (value: string) => {
        const numbers = value.replace(/\D/g, '').slice(0, 8)
        if (numbers.length <= 5) return numbers
        return `${numbers.slice(0, 5)}-${numbers.slice(5)}`
    }

    const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLogoFile(file)
        setLogoPreview(URL.createObjectURL(file))
        setUploadingLogo(true)
        setErrorMessage(null)

        try {
            const logo = await compressImage(file, 'logo')
            const fileName = `company-${companyId}-logo-${Date.now()}.${extensionOf(logo)}`
            const filePath = `company-logos/${fileName}`

            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(filePath, logo, { upsert: true, contentType: logo.type })

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(data.path)

            setCompanyDetails(prev => ({ ...prev, logo_url: publicUrl }))
        } catch (err: any) {
            console.error('Error uploading logo during onboarding:', err)
            setErrorMessage('Falha no upload da logo. Tente novamente.')
        } finally {
            setUploadingLogo(false)
        }
    }

    const removeLogo = () => {
        setLogoFile(null)
        setLogoPreview('')
        setCompanyDetails(prev => ({ ...prev, logo_url: '' }))
    }

    const handleFinish = async () => {
        setSaving(true)
        setErrorMessage(null)
        try {
            const response = await fetch(`/api/company/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: companyDetails.name,
                    cnpj: companyDetails.cnpj || null,
                    phone: companyDetails.phone || null,
                    address: companyDetails.address || null,
                    city: companyDetails.city || null,
                    state: companyDetails.state || null,
                    zip_code: companyDetails.zip_code || null,
                    logo_url: companyDetails.logo_url || null,
                    google_review_url: companyDetails.google_review_url || null,
                    warranty_terms: companyDetails.warranty_terms || null,
                    settings: {
                        segment: companyDetails.segment
                    }
                })
            })
            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Falha ao salvar empresa: ${errorText}`)
            }

            // Save first customer and OS if provided
            if (osDetails.customerName && osDetails.equipment) {
                const customerRes = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: osDetails.customerName,
                        phone: osDetails.customerPhone || null
                    })
                })

                if (!customerRes.ok) {
                    const errData = await customerRes.json()
                    console.error('Erro ao criar cliente no onboarding:', errData)
                    // Continue without blocking — customer creation is optional
                } else {
                    const customerData = await customerRes.json()
                    const customerId = customerData?.id

                    if (customerId) {
                        const osRes = await fetch('/api/service-orders', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                customer_id: customerId,
                                // 'title' is required by serviceOrderSchema
                                title: osDetails.equipment,
                                equipment_description: osDetails.equipment,
                                // Correct field name: problem_description (not defect_description)
                                problem_description: osDetails.defect || null,
                                status: 'aberta',
                                priority: 'normal',
                                estimated_cost: 0,
                                parts_cost: 0,
                                labor_cost: 0,
                                discount_amount: 0,
                                warranty_months: 0,
                                turns_on: true,
                                items: [],
                            })
                        })
                        if (!osRes.ok) {
                            const errData = await osRes.json()
                            console.error('Erro ao criar OS no onboarding:', errData)
                        }
                    }
                }
            }

            // Only call onComplete after everything saved successfully
            onComplete()
        } catch (err) {
            console.error('Erro durante configuração do onboarding:', err)
            setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido ao salvar. Tente novamente.')
        } finally {
            setSaving(false)
        }
    }


    const stepsCount = 6

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 dark:bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card border border-border shadow-[0_32px_128px_rgba(0,0,0,0.5)] rounded-3xl max-w-xl w-full overflow-hidden relative flex flex-col min-h-[520px] p-8 md:p-10 justify-between">
                
                {/* Step indicator */}
                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                    <span>Configuração Completa do Perfil</span>
                    <span>Etapa {step} de {stepsCount}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / stepsCount) * 100}%` }} />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col justify-center">
                    {step === 1 && (
                        <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                                <Sparkles className="w-8 h-8 animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tighter text-foreground ">Configure seu Perfil</h2>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Vamos configurar sua marca, endereço e link do Google Review. Seus clientes verão essas informações nas OS e orçamentos.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-primary" /> Identificação
                                </h3>
                                <p className="text-xs text-muted-foreground">Informações primárias da sua assistência técnica.</p>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[13px] font-medium text-muted-foreground">Nome da Assistência *</label>
                                    <input 
                                        type="text" 
                                        value={companyDetails.name}
                                        onChange={(e) => setCompanyDetails(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                        placeholder="Ex: Nexus Assistência"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">CNPJ (Opcional)</label>
                                        <input 
                                            type="text" 
                                            value={companyDetails.cnpj}
                                            onChange={(e) => setCompanyDetails(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="00.000.000/0001-00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">Telefone de Contato</label>
                                        <input 
                                            type="text" 
                                            value={companyDetails.phone}
                                            onChange={(e) => setCompanyDetails(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" /> Endereço Comercial
                                </h3>
                                <p className="text-xs text-muted-foreground">O endereço é exibido nos recibos de entrada e saída.</p>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[13px] font-medium text-muted-foreground">Logradouro e Número</label>
                                    <input 
                                        type="text" 
                                        value={companyDetails.address}
                                        onChange={(e) => setCompanyDetails(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                        placeholder="Ex: Av. Paulista, 1000 - Sala 12"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">CEP</label>
                                        <input 
                                            type="text" 
                                            value={companyDetails.zip_code}
                                            onChange={(e) => setCompanyDetails(prev => ({ ...prev, zip_code: formatCEP(e.target.value) }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="01310-100"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">Cidade</label>
                                        <input 
                                            type="text" 
                                            value={companyDetails.city}
                                            onChange={(e) => setCompanyDetails(prev => ({ ...prev, city: e.target.value }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="São Paulo"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">Estado</label>
                                        <input 
                                            type="text" 
                                            value={companyDetails.state}
                                            onChange={(e) => setCompanyDetails(prev => ({ ...prev, state: e.target.value }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="SP"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary" /> Identidade Visual & Reviews
                                </h3>
                                <p className="text-xs text-muted-foreground">Envie sua logo e ative a coleta automática de avaliações.</p>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <label className="block text-[13px] font-medium text-muted-foreground flex items-center gap-1">
                                        <Camera className="w-3.5 h-3.5" /> Enviar Logomarca (Opcional)
                                    </label>
                                    
                                    <div className="flex items-center gap-6 p-4 rounded-2xl border border-dashed border-border bg-white/[0.02]">
                                        {logoPreview ? (
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center">
                                                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                                                <button
                                                    type="button"
                                                    onClick={removeLogo}
                                                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border border-dashed border-border/80 bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                                {uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoFileChange}
                                                    className="hidden"
                                                    disabled={uploadingLogo}
                                                />
                                            </label>
                                        )}
                                        <div className="flex-1 text-left">
                                            <p className="text-xs font-bold text-foreground">Logotipo da Loja</p>
                                            <p className="text-[11px] text-muted-foreground">PNG, JPG de até 2MB</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1">
                                        <LinkIcon className="w-3.5 h-3.5" /> Link do Google Review (Opcional)
                                    </label>
                                    <input 
                                        type="url" 
                                        value={companyDetails.google_review_url}
                                        onChange={(e) => setCompanyDetails(prev => ({ ...prev, google_review_url: e.target.value }))}
                                        className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                        placeholder="https://g.page/r/XP-sua-assistencia/review"
                                    />
                                    <span className="text-[11px] text-muted-foreground font-bold block mt-1">Seus clientes receberão esse link para avaliar sua loja no Google após a conclusão da OS.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-primary" /> Criar Primeira OS de Teste
                                </h3>
                                <p className="text-xs text-muted-foreground">Experimente o controle de fluxos, atualizações via WhatsApp e faturamento.</p>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">Cliente de Teste</label>
                                        <input 
                                            type="text" 
                                            value={osDetails.customerName}
                                            onChange={(e) => setOsDetails(prev => ({ ...prev, customerName: e.target.value }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="Ex: João da Silva"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">Telefone do Cliente</label>
                                        <input 
                                            type="text" 
                                            value={osDetails.customerPhone}
                                            onChange={(e) => setOsDetails(prev => ({ ...prev, customerPhone: formatPhone(e.target.value) }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="(11) 98888-8888"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">Aparelho / Equipamento</label>
                                        <input 
                                            type="text" 
                                            value={osDetails.equipment}
                                            onChange={(e) => setOsDetails(prev => ({ ...prev, equipment: e.target.value }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="Ex: Samsung Galaxy S23"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground">Problema Relatado</label>
                                        <input 
                                            type="text" 
                                            value={osDetails.defect}
                                            onChange={(e) => setOsDetails(prev => ({ ...prev, defect: e.target.value }))}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/5 focus:border-primary/20 rounded-xl text-sm font-bold text-foreground focus:outline-none transition-colors"
                                            placeholder="Ex: Não liga / Conector quebrado"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tighter text-foreground ">Setup Concluído!</h2>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Seus dados comerciais, endereço e configurações de avaliação foram salvos. Você está pronto para gerenciar sua assistência técnica com nível profissional.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="pt-8 border-t border-border/10 flex flex-col gap-3 mt-6">
                    {errorMessage && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <X className="w-4 h-4 mt-0.5 shrink-0" />
                            <span className="flex-1 break-words">{errorMessage}</span>
                            <button
                                type="button"
                                onClick={() => setErrorMessage(null)}
                                className="opacity-60 hover:opacity-100 transition-opacity"
                                aria-label="Fechar erro"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    <div className="flex gap-4">
                    {step > 1 && step < stepsCount && (
                        <button
 onClick={() => setStep(prev => prev - 1)}
 className="px-6 py-3.5 bg-white/5 text-xs font-black hover:bg-white/10 rounded-xl text-foreground transition-colors"
 >
                            Voltar
                        </button>
                    )}
                    {step < stepsCount ? (
                        <button
 onClick={() => setStep(prev => prev + 1)}
 disabled={step === 2 && !companyDetails.name}
 className="flex-1 py-3.5 bg-primary text-white text-xs font-black hover:bg-primary/95 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
                            Continuar
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
 onClick={handleFinish}
 disabled={saving || uploadingLogo}
 className="flex-1 py-3.5 bg-primary text-white text-xs font-black hover:bg-primary/95 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
 >
                            {saving ? 'Salvando...' : 'Finalizar Setup'}
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                    </div>
                </div>

            </div>
        </div>
    )
}
