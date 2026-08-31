'use client'

import { useState, useEffect } from 'react'
import { 
    Palette, Sparkles, Globe, MessageSquare, Megaphone, 
    Save, Copy, ExternalLink, RefreshCw, Check, ShieldCheck, Smartphone, Truck, CreditCard, Layers
} from 'lucide-react'
import { CatalogSettings, CatalogTheme } from '@/types/devices'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

const PRESET_THEMES: { name: string; icon: string; theme: CatalogTheme }[] = [
    {
        name: 'Cyber Emerald',
        icon: '🌙',
        theme: {
            primary: '#10B981',
            accent: '#34D399',
            background: '#0A0D14',
            card_bg: '#111622'
        }
    },
    {
        name: 'Apple Dark Slate',
        icon: '💎',
        theme: {
            primary: '#38BDF8',
            accent: '#7DD3FC',
            background: '#0F172A',
            card_bg: '#1E293B'
        }
    },
    {
        name: 'Gold Luxury Obsidian',
        icon: '🔥',
        theme: {
            primary: '#F59E0B',
            accent: '#FBBF24',
            background: '#121212',
            card_bg: '#1E1E1E'
        }
    },
    {
        name: 'Purple Volt',
        icon: '🍇',
        theme: {
            primary: '#A855F7',
            accent: '#C084FC',
            background: '#0D0B14',
            card_bg: '#161224'
        }
    },
    {
        name: 'Cyan Neon',
        icon: '⚡',
        theme: {
            primary: '#06B6D4',
            accent: '#67E8F9',
            background: '#080E14',
            card_bg: '#0F1923'
        }
    }
]

interface CatalogSettingsFormProps {
    initialSlug: string
    onSaveSuccess?: () => void
}

export default function CatalogSettingsForm({ initialSlug, onSaveSuccess }: CatalogSettingsFormProps) {
    const [slug, setSlug] = useState(initialSlug || 'minha-loja')
    const [catalogTitle, setCatalogTitle] = useState('Nosso Catálogo Oficial')
    const [announcementBar, setAnnouncementBar] = useState('⚡ Frete Rápido via Motoboy & Garantia em todos os celulares!')
    const [whatsappNumber, setWhatsappNumber] = useState('')
    const [whatsappCustomMessage, setWhatsappCustomMessage] = useState('Olá! Vi no seu catálogo e gostaria de mais informações sobre o produto.')
    
    // Custom Configuration Fields (Garantia, Entrega, Métodos de Pagamento, Tipos de Aparelhos)
    const [warrantyText, setWarrantyText] = useState('Garantia da Loja inclusa em todos os aparelhos')
    const [deliveryText, setDeliveryText] = useState('Entrega rápida via Motoboy ou retirada em mãos na loja')
    const [paymentMethodsText, setPaymentMethodsText] = useState('Até 12x no cartão de crédito ou PIX com desconto')
    const [deviceConditionMode, setDeviceConditionMode] = useState<'todos' | 'novos' | 'seminovos'>('todos')

    // 4 Custom Colors
    const [primaryColor, setPrimaryColor] = useState('#10B981')
    const [accentColor, setAccentColor] = useState('#34D399')
    const [backgroundColor, setBackgroundColor] = useState('#0A0D14')
    const [cardBgColor, setCardBgColor] = useState('#111622')

    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/catalog/me')
            if (res.ok) {
                const data = await res.json()
                if (data.slug) setSlug(data.slug)
                if (data.settings) {
                    setCatalogTitle(data.settings.catalog_title || 'Nosso Catálogo Oficial')
                    setWhatsappNumber(data.settings.whatsapp_number || data.settings.companies?.phone || '')
                    setAnnouncementBar(data.settings.announcement_bar || '⚡ Frete Rápido via Motoboy & Garantia em todos os celulares!')
                    setWhatsappCustomMessage(data.settings.whatsapp_custom_message || 'Olá! Vi no seu catálogo e gostaria de comprar o produto.')
                    
                    if (data.settings.warranty_text) setWarrantyText(data.settings.warranty_text)
                    if (data.settings.delivery_text) setDeliveryText(data.settings.delivery_text)
                    if (data.settings.payment_methods_text) setPaymentMethodsText(data.settings.payment_methods_text)
                    if (data.settings.device_condition_mode) setDeviceConditionMode(data.settings.device_condition_mode)

                    if (data.settings.theme) {
                        setPrimaryColor(data.settings.theme.primary || '#10B981')
                        setAccentColor(data.settings.theme.accent || '#34D399')
                        setBackgroundColor(data.settings.theme.background || '#0A0D14')
                        setCardBgColor(data.settings.theme.card_bg || '#111622')
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }
    }

    const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
        setPrimaryColor(preset.theme.primary)
        setAccentColor(preset.theme.accent)
        setBackgroundColor(preset.theme.background)
        setCardBgColor(preset.theme.card_bg)
        toast.success(`Tema "${preset.name}" aplicado!`)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        const cleanSlug = slug
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')

        const payload = {
            slug: cleanSlug,
            catalog_title: catalogTitle,
            announcement_bar: announcementBar,
            whatsapp_number: whatsappNumber,
            whatsapp_custom_message: whatsappCustomMessage,
            warranty_text: warrantyText,
            delivery_text: deliveryText,
            payment_methods_text: paymentMethodsText,
            device_condition_mode: deviceConditionMode,
            theme: {
                primary: primaryColor,
                accent: accentColor,
                background: backgroundColor,
                card_bg: cardBgColor
            }
        }

        try {
            // 1. Save to database backend
            const res = await fetch('/api/catalog/me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            // 2. Save locally as fallback & trigger instant window sync
            localStorage.setItem('nexus_catalog_settings', JSON.stringify(payload))
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('nexus_catalog_settings_updated'))
            }

            if (res.ok) {
                toast.success('Configurações do Catálogo salvas e integradas!')
            } else {
                toast.success('Configurações salvas no dispositivo!')
            }

            if (onSaveSuccess) onSaveSuccess()
        } catch (error) {
            localStorage.setItem('nexus_catalog_settings', JSON.stringify(payload))
            toast.success('Configurações salvas no dispositivo!')
            if (onSaveSuccess) onSaveSuccess()
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* PAINEL DE CONFIGURAÇÕES (COLUNA DA ESQUERDA) */}
            <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
                
                {/* 1. NOVAS CAIXAS DE CONFIGURAÇÃO (GARANTIA, ENTREGA, PAGAMENTO E TIPOS DE APARELHOS) */}
                <div className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-base">Informações & Regras do Catálogo</h3>
                            <p className="text-xs text-muted-foreground">Configure as mensagens de garantia, entrega, métodos de pagamento e tipos de aparelhos.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tipo de Aparelhos Vendidos */}
                        <div className="col-span-full space-y-1.5 bg-background p-4 rounded-2xl border border-border">
                            <label className="text-[10px] font-black uppercase text-primary tracking-widest block">Tipos de Celulares Exibidos no Catálogo</label>
                            <select
                                value={deviceConditionMode}
                                onChange={e => setDeviceConditionMode(e.target.value as any)}
                                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                            >
                                <option value="todos">✨ Vendo Novos Lacrados e Seminovos</option>
                                <option value="novos">📦 Vendo SOMENTE Aparelhos Novos Lacrados</option>
                                <option value="seminovos">📱 Vendo SOMENTE Aparelhos Seminovos</option>
                            </select>
                        </div>

                        {/* Garantia */}
                        <div className="space-y-1 bg-background p-3.5 rounded-2xl border border-border">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Texto de Garantia
                            </label>
                            <input
                                type="text"
                                value={warrantyText}
                                onChange={e => setWarrantyText(e.target.value)}
                                placeholder="Ex: Garantia da Loja inclusa em todos os aparelhos"
                                className="w-full bg-card border border-border rounded-xl p-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        {/* Entrega */}
                        <div className="space-y-1 bg-background p-3.5 rounded-2xl border border-border">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                                Opções de Entrega
                            </label>
                            <input
                                type="text"
                                value={deliveryText}
                                onChange={e => setDeliveryText(e.target.value)}
                                placeholder="Ex: Entrega via Motoboy ou retirada na loja"
                                className="w-full bg-card border border-border rounded-xl p-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        {/* Parcelamento e Pagamentos */}
                        <div className="col-span-full space-y-1 bg-background p-3.5 rounded-2xl border border-border">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                                Parcelamento & Formas de Pagamento
                            </label>
                            <input
                                type="text"
                                value={paymentMethodsText}
                                onChange={e => setPaymentMethodsText(e.target.value)}
                                placeholder="Ex: Até 12x no cartão de crédito ou PIX com desconto"
                                className="w-full bg-card border border-border rounded-xl p-2.5 text-xs font-bold outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. SELEÇÃO DA PALETA DE 4 CORES */}
                <div className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-base">Paleta de Cores do Catálogo (4 Cores)</h3>
                            <p className="text-xs text-muted-foreground">Personalize as cores primárias, fundo e botões da sua vitrine pública.</p>
                        </div>
                    </div>

                    {/* Presets Pré-Configurados de 1-Clique */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Temas Pré-Configurados (1-Clique)</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {PRESET_THEMES.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => applyPreset(preset)}
                                    className="p-3 bg-background border border-border hover:border-primary/50 rounded-2xl text-left transition-all space-y-2 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold group-hover:text-primary transition-colors flex items-center gap-1.5">
                                            <span>{preset.icon}</span> {preset.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: preset.theme.primary }} />
                                        <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: preset.theme.accent }} />
                                        <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: preset.theme.background }} />
                                        <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: preset.theme.card_bg }} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Selectors Box */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        <div className="space-y-1.5 bg-background p-3 rounded-2xl border border-border">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">1. Cor Botões/PIX</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={e => setPrimaryColor(e.target.value)}
                                    className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent"
                                />
                                <span className="text-xs font-mono font-bold uppercase">{primaryColor}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5 bg-background p-3 rounded-2xl border border-border">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">2. Cor Acentos</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={accentColor}
                                    onChange={e => setAccentColor(e.target.value)}
                                    className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent"
                                />
                                <span className="text-xs font-mono font-bold uppercase">{accentColor}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5 bg-background p-3 rounded-2xl border border-border">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">3. Fundo da Página</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={e => setBackgroundColor(e.target.value)}
                                    className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent"
                                />
                                <span className="text-xs font-mono font-bold uppercase">{backgroundColor}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5 bg-background p-3 rounded-2xl border border-border">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">4. Fundo dos Cards</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={cardBgColor}
                                    onChange={e => setCardBgColor(e.target.value)}
                                    className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent"
                                />
                                <span className="text-xs font-mono font-bold uppercase">{cardBgColor}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. SLUG E MENSAGENS DO CATÁLOGO */}
                <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-base">URL & Mensagens do Catálogo</h3>
                            <p className="text-xs text-muted-foreground">Personalize o link exclusivo da sua loja e a mensagem de oferta de topo.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Link Exclusivo da Sua Loja (Slug)</label>
                            <div className="flex items-center bg-background border border-border rounded-2xl px-3 py-2.5 text-xs font-mono font-bold">
                                <span className="text-muted-foreground select-none">https://nexusgestor.com/loja/</span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                    className="bg-transparent text-primary outline-none font-bold flex-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Título Principal do Catálogo</label>
                            <input
                                type="text"
                                value={catalogTitle}
                                onChange={e => setCatalogTitle(e.target.value)}
                                placeholder="Ex: Catálogo Oficial • Support Store"
                                className="w-full bg-background border border-border rounded-2xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Barra Promocional de Topo (Marquee/Aviso)</label>
                            <input
                                type="text"
                                value={announcementBar}
                                onChange={e => setAnnouncementBar(e.target.value)}
                                placeholder="Ex: ⚡ Frete Grátis via Motoboy na compra de qualquer iPhone hoje!"
                                className="w-full bg-background border border-border rounded-2xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Mensagem Padrão Enviada no WhatsApp pelo Cliente</label>
                            <textarea
                                value={whatsappCustomMessage}
                                onChange={e => setWhatsappCustomMessage(e.target.value)}
                                rows={2}
                                className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-3 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </form>

            {/* MOCKUP DE PRÉ-VISUALIZAÇÃO EM TEMPO REAL (COLUNA DA DIREITA) */}
            <div className="lg:col-span-5 sticky top-24 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Pré-Visualização ao Vivo do Catálogo
                    </span>
                </div>

                {/* Smartphone Screen Mockup Container */}
                <div 
                    className="rounded-3xl border-4 border-slate-800 p-4 space-y-4 shadow-2xl overflow-hidden transition-all duration-300 font-sans"
                    style={{ backgroundColor: backgroundColor, color: '#FFFFFF' }}
                >
                    {/* Top Announcement Bar */}
                    {announcementBar && (
                        <div className="py-1 px-3 rounded-xl text-[10px] font-bold text-center truncate text-black" style={{ backgroundColor: primaryColor }}>
                            {announcementBar}
                        </div>
                    )}

                    {/* Header Mockup */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-black" style={{ backgroundColor: primaryColor }}>
                                SS
                            </div>
                            <div>
                                <h4 className="text-xs font-black truncate max-w-[140px]">{catalogTitle}</h4>
                                <span className="text-[9px] font-mono opacity-70" style={{ color: accentColor }}>CNPJ: 00.000.000/0001-00</span>
                            </div>
                        </div>

                        <div className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase text-black" style={{ backgroundColor: primaryColor }}>
                            WhatsApp
                        </div>
                    </div>

                    {/* Trust Strip Mockup */}
                    <div className="p-3 rounded-2xl border border-white/10 space-y-2 text-[10px]" style={{ backgroundColor: cardBgColor }}>
                        <div className="flex items-center gap-1.5 font-bold" style={{ color: primaryColor }}>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {warrantyText}
                        </div>
                        <div className="flex items-center gap-1.5 opacity-80">
                            <Truck className="w-3.5 h-3.5" />
                            {deliveryText}
                        </div>
                        <div className="flex items-center gap-1.5 opacity-80">
                            <CreditCard className="w-3.5 h-3.5" />
                            {paymentMethodsText}
                        </div>
                    </div>

                    {/* Sample Product Card Mockup */}
                    <div className="p-3 rounded-2xl border border-white/10 space-y-3" style={{ backgroundColor: cardBgColor }}>
                        <div className="w-full h-24 bg-black/40 rounded-xl flex items-center justify-center border border-white/10">
                            <Smartphone className="w-8 h-8 opacity-40" />
                        </div>

                        <div className="space-y-1">
                            <h6 className="text-xs font-black">iPhone 13 Pro 128GB</h6>
                            <p className="text-[10px] opacity-70">Azul Sierra • Bateria 92%</p>
                        </div>

                        <div className="p-2 rounded-xl flex items-center justify-between bg-black/30">
                            <div>
                                <span className="text-[7px] font-black uppercase opacity-60 block">À VISTA (PIX)</span>
                                <span className="text-sm font-black" style={{ color: primaryColor }}>R$ 3.490,00</span>
                            </div>
                            <span className="text-[9px] font-bold" style={{ color: accentColor }}>12x R$ 325</span>
                        </div>

                        <div className="w-full py-2 rounded-xl text-[10px] font-black uppercase text-center text-black" style={{ backgroundColor: primaryColor }}>
                            Comprar pelo WhatsApp
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
