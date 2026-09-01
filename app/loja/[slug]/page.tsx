'use client'

import { useState, useEffect, use, Suspense } from 'react'
import { 
    Smartphone, Search, ShoppingBag, MessageSquare, ShieldCheck, 
    Filter, RefreshCw, Zap, Check, ArrowRight, ExternalLink, Star,
    Building2, MapPin, Phone, Award, CheckCircle2, ChevronRight, X, Eye, Image as ImageIcon, Camera
} from 'lucide-react'
import { Device } from '@/types/devices'
import { formatCurrency, cn } from '@/lib/utils'

interface PublicCatalogData {
    settings: {
        catalog_title?: string
        whatsapp_number?: string
        companies?: {
            name: string
            cnpj?: string
            city?: string
            state?: string
            phone?: string
            address?: string
            logo_url?: string
            email?: string
        }
    }
    devices: Device[]
    inventory: Array<{
        id: string
        name: string
        category: string
        sale_price: number
        quantity_in_stock: number
        description?: string
        image_url?: string
    }>
}

export function DynamicCatalogContent({ slug }: { slug: string }) {
    const [data, setData] = useState<PublicCatalogData | null>(null)
    const [loading, setLoading] = useState(true)

    const [allDevices, setAllDevices] = useState<Device[]>([])
    const [activeTab, setActiveTab] = useState<'devices' | 'accessories'>('devices')
    const [selectedBrand, setSelectedBrand] = useState('todas')
    const [priceRange, setPriceRange] = useState<'todos' | 'ate1500' | '1500_3000' | 'acima3000'>('todos')
    const [searchQuery, setSearchQuery] = useState('')

    // Product Modal Details
    const [selectedDeviceModal, setSelectedDeviceModal] = useState<Device | null>(null)
    const [activePhotoIndex, setActivePhotoIndex] = useState(0)

    // Dynamic Settings & Local Sync State
    const [localSettings, setLocalSettings] = useState<any>(null)

    useEffect(() => {
        const loadLocal = () => {
            try {
                const raw = localStorage.getItem('nexus_catalog_settings')
                if (raw) setLocalSettings(JSON.parse(raw))
            } catch (e) {}
        }
        loadLocal()
        window.addEventListener('nexus_catalog_settings_updated', loadLocal)
        return () => window.removeEventListener('nexus_catalog_settings_updated', loadLocal)
    }, [])

    useEffect(() => {
        fetchCatalog()
    }, [slug])

    const fetchCatalog = async () => {
        setLoading(true)
        let remoteDevices: Device[] = []
        try {
            const res = await fetch(`/api/catalog/${slug}`)
            if (res.ok) {
                const catalogData = await res.json()
                setData(catalogData)
                if (Array.isArray(catalogData.devices)) {
                    remoteDevices = catalogData.devices
                }
            }
        } catch (error) {
            console.error('Error loading public catalog:', error)
        }

        // Merge with local devices to ensure user added devices always display
        try {
            const localRaw = typeof window !== 'undefined' ? localStorage.getItem('nexus_devices') : null
            const localItems: Device[] = localRaw ? JSON.parse(localRaw) : []
            const remoteIds = new Set(remoteDevices.map(d => d.id))
            const uniqueLocal = localItems.filter(l => !remoteIds.has(l.id))
            setAllDevices([...remoteDevices, ...uniqueLocal])
        } catch (e) {
            setAllDevices(remoteDevices)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                    <Smartphone className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
                </div>
                <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase animate-pulse">Carregando Catálogo da Loja...</p>
            </div>
        )
    }

    const company = data?.settings?.companies
    const companyName = company?.name || 'Assistência & Celulares'
    const companyCnpj = company?.cnpj || ''
    const companyCity = company?.city || ''
    const companyState = company?.state || ''
    const companyPhone = data?.settings?.whatsapp_number || company?.phone || ''
    const companyLogo = company?.logo_url

    const accessoriesList = data?.inventory || []

    const mergedSettings = { ...localSettings, ...data?.settings }
    const theme = mergedSettings?.theme || localSettings?.theme || (data?.settings as any)?.theme || {
        primary: '#10B981',
        accent: '#34D399',
        background: '#0A0D14',
        card_bg: '#111622'
    }
    const announcementBarText = mergedSettings?.announcement_bar || localSettings?.announcement_bar || null
    const whatsappCustomMsg = mergedSettings?.whatsapp_custom_message || localSettings?.whatsapp_custom_message || 'Olá! Vi no seu catálogo e gostaria de comprar.'
    const warrantyText = mergedSettings?.warranty_text || localSettings?.warranty_text || 'Garantia da Loja inclusa'
    const deliveryText = mergedSettings?.delivery_text || localSettings?.delivery_text || 'Entrega Via Motoboy'
    const paymentMethodsText = mergedSettings?.payment_methods_text || localSettings?.payment_methods_text || 'Até 12x no Cartão'
    const deviceConditionMode = mergedSettings?.device_condition_mode || localSettings?.device_condition_mode || 'todos'

    // Dynamically extract ONLY brands that exist in allDevices
    const registeredBrands = Array.from(new Set(allDevices.map(d => d.brand).filter(Boolean)))
    const availableBrands = ['todas', ...registeredBrands]

    const filteredDevices = allDevices.filter(d => {
        if (deviceConditionMode === 'novos' && d.condition !== 'novo_lacrado') return false
        if (deviceConditionMode === 'seminovos' && d.condition === 'novo_lacrado') return false

        if (selectedBrand !== 'todas' && d.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false
        
        if (priceRange === 'ate1500' && d.cash_price > 1500) return false
        if (priceRange === '1500_3000' && (d.cash_price < 1500 || d.cash_price > 3000)) return false
        if (priceRange === 'acima3000' && d.cash_price < 3000) return false

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return d.model.toLowerCase().includes(q) || d.brand.toLowerCase().includes(q)
        }
        return true
    })

    const filteredAccessories = accessoriesList.filter(a => {
        if (searchQuery) {
            return a.name.toLowerCase().includes(searchQuery.toLowerCase())
        }
        return true
    })

    const openWhatsAppInterest = (itemName: string, price: number, extraDetails?: string) => {
        const cleanPhone = companyPhone.replace(/\D/g, '')
        let text = `${whatsappCustomMsg}\n\n*Produto:* ${itemName}\n*Preço à Vista:* ${formatCurrency(price)}`
        if (extraDetails) text += ` (${extraDetails})`

        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
    }

    return (
        <div className="min-h-screen text-slate-100 font-sans selection:bg-emerald-500 selection:text-black transition-colors duration-300" style={{ backgroundColor: theme.background }}>
            {/* ANNOUNCEMENT BAR MARQUEE */}
            {announcementBarText && (
                <div 
                    className="py-2 px-4 text-center font-black text-xs uppercase tracking-wider shadow-md text-black"
                    style={{ backgroundColor: theme.primary }}
                >
                    {announcementBarText}
                </div>
            )}

            {/* STICKY HEADER COM IDENTIDADE VISUAL */}
            <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl" style={{ backgroundColor: `${theme.card_bg}EE` }}>
                <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
                    {/* Logo + Store Name + CNPJ */}
                    <div className="flex items-center gap-3">
                        {companyLogo ? (
                            <div className="w-11 h-11 rounded-2xl overflow-hidden border p-0.5 bg-black shadow-lg" style={{ borderColor: `${theme.primary}50` }}>
                                <img src={companyLogo} alt={companyName} className="w-full h-full object-cover rounded-xl" />
                            </div>
                        ) : (
                            <div className="w-11 h-11 rounded-2xl text-black font-black text-lg flex items-center justify-center shadow-lg" style={{ backgroundColor: theme.primary }}>
                                {companyName.substring(0, 2).toUpperCase()}
                            </div>
                        )}

                        <div>
                            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                                {companyName}
                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
                            </h1>
                            {companyCity && (
                                <p className="text-[11px] text-slate-400 font-semibold flex flex-wrap items-center gap-2">
                                    <span>{companyCity}{companyState ? `/${companyState}` : ''}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* WhatsApp Fast Button */}
                    {companyPhone && (
                        <button
                            onClick={() => openWhatsAppInterest('Atendimento Geral', 0)}
                            className="px-4 py-2 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95"
                            style={{ backgroundColor: theme.primary }}
                        >
                            <MessageSquare className="w-4 h-4 fill-current" />
                            <span className="hidden sm:inline">Falar no</span> WhatsApp
                        </button>
                    )}
                </div>
            </header>

            {/* HERO SECTION DE ALTA CONVERSÃO */}
            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                <div className="relative overflow-hidden rounded-3xl border border-slate-800 p-6 md:p-10 shadow-2xl space-y-6" style={{ backgroundColor: theme.card_bg }}>
                    {/* Background glow effects */}
                    <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: theme.primary }} />

                    <div className="relative z-10 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 border" style={{ backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}40`, color: theme.primary }}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Catálogo Verificado • {companyName}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-800/80 px-3 py-1 rounded-full">
                                {warrantyText}
                            </span>
                        </div>

                        <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white leading-tight max-w-2xl">
                            Celulares Selecionados em <span style={{ color: theme.primary }}>{companyCity || 'nossa loja'}</span>.
                        </h2>
                        
                        <p className="text-xs md:text-sm text-slate-400 max-w-xl leading-relaxed">
                            {deviceConditionMode === 'novos' && 'Aparelhos 100% novos lacrados na caixa com garantia oficial.'}
                            {deviceConditionMode === 'seminovos' && 'Seminovos originais de procedência garantida com teste técnico completo.'}
                            {deviceConditionMode === 'todos' && 'Aparelhos novos lacrados e seminovos originais com procedência garantida e parcelamento facilitado.'}
                        </p>
                    </div>

                    {/* Trust badges strip */}
                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: theme.primary }} />
                            {warrantyText}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: theme.primary }} />
                            {deliveryText}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: theme.primary }} />
                            {paymentMethodsText}
                        </div>
                    </div>
                </div>

                {/* FILTROS E PESQUISA */}
                <div className="border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4 shadow-xl" style={{ backgroundColor: theme.card_bg }}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-96">
                            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar modelo de celular..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none transition-all placeholder:text-slate-500"
                                style={{ backgroundColor: theme.background }}
                            />
                        </div>

                        {/* Abas Celulares vs Acessórios */}
                        <div className="flex items-center gap-2 w-full md:w-auto p-1.5 rounded-2xl border border-slate-800" style={{ backgroundColor: theme.background }}>
                            <button
                                onClick={() => setActiveTab('devices')}
                                className={cn(
                                    "flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'devices' ? "text-black font-black shadow-lg" : "text-slate-400 hover:text-white"
                                )}
                                style={activeTab === 'devices' ? { backgroundColor: theme.primary } : {}}
                            >
                                <Smartphone className="w-4 h-4" />
                                Celulares ({allDevices.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('accessories')}
                                className={cn(
                                    "flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'accessories' ? "text-black font-black shadow-lg" : "text-slate-400 hover:text-white"
                                )}
                                style={activeTab === 'accessories' ? { backgroundColor: theme.primary } : {}}
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Acessórios ({accessoriesList.length})
                            </button>
                        </div>
                    </div>

                    {/* Filtros Secundários por Marca e Faixa de Preço */}
                    {activeTab === 'devices' && (
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
                            {/* Marcas (SOMENTE AS MARCAS CADASTRADAS NO ESTOQUE DA LOJA) */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1">Marca:</span>
                                {availableBrands.map(brand => (
                                    <button
                                        key={brand}
                                        onClick={() => setSelectedBrand(brand)}
                                        className={cn(
                                            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                            selectedBrand === brand
                                                ? "border-emerald-500 text-white"
                                                : "border-slate-800 text-slate-400 hover:text-white"
                                        )}
                                        style={selectedBrand === brand ? { backgroundColor: `${theme.primary}30`, borderColor: theme.primary, color: theme.primary } : { backgroundColor: theme.background }}
                                    >
                                        {brand === 'todas' ? 'Todas as Marcas' : brand}
                                    </button>
                                ))}
                            </div>

                            {/* Faixa de Preço */}
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preço:</span>
                                <select
                                    value={priceRange}
                                    onChange={e => setPriceRange(e.target.value as any)}
                                    className="border border-slate-800 text-slate-300 font-bold text-xs rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                                    style={{ backgroundColor: theme.background }}
                                >
                                    <option value="todos">Qualquer Preço</option>
                                    <option value="ate1500">Até R$ 1.500</option>
                                    <option value="1500_3000">R$ 1.500 a R$ 3.000</option>
                                    <option value="acima3000">Acima de R$ 3.000</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* ABA 1: GRID DE CELULARES */}
                {activeTab === 'devices' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDevices.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-[#111622] border border-dashed border-slate-800 rounded-3xl p-8 space-y-3">
                                <Smartphone className="w-12 h-12 text-slate-600 mx-auto" />
                                <h3 className="font-bold text-base text-slate-300">Nenhum aparelho disponível no momento</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">Adicione celulares no seu painel para exibi-los aqui no catálogo.</p>
                            </div>
                        ) : (
                            filteredDevices.map(device => {
                                const photos = Array.isArray(device.images) && device.images.length > 0 ? device.images : []
                                const hasPhotos = photos.length > 0

                                return (
                                    <div
                                        key={device.id}
                                        className="border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1 hover:shadow-2xl"
                                        style={{ backgroundColor: theme.card_bg }}
                                    >
                                        <div className="space-y-3">
                                            {/* Photo Preview / Thumb Header */}
                                            <div className="relative w-full h-48 bg-black/40 rounded-2xl overflow-hidden border border-slate-800/80 flex items-center justify-center transition-all">
                                                {hasPhotos ? (
                                                    <img
                                                        src={photos[0]}
                                                        alt={device.model}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <Smartphone className="w-12 h-12 text-slate-700 mx-auto" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Fotos Sob Consulta</span>
                                                    </div>
                                                )}

                                                {/* Top Badges */}
                                                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                                                    <span 
                                                        className="text-[9px] font-black uppercase tracking-widest bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 shadow-md"
                                                        style={{ color: theme.primary }}
                                                    >
                                                        {device.condition === 'novo_lacrado' ? 'NOVO LACRADO' : 'SEMINOVO PREMIUM'}
                                                    </span>
                                                    {device.storage && (
                                                        <span className="text-[9px] font-mono font-bold text-white bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800">
                                                            {device.storage}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Gallery Overlay Button */}
                                                {hasPhotos && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDeviceModal(device)
                                                            setActivePhotoIndex(0)
                                                        }}
                                                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/80 hover:bg-black text-white rounded-xl text-[10px] font-bold backdrop-blur-md border border-slate-700 transition-all flex items-center gap-1.5 shadow-lg"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" style={{ color: theme.primary }} />
                                                        {photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Details Block */}
                                            <div>
                                                <h3 className="text-lg font-black text-white transition-colors">
                                                    {device.brand} {device.model}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                    {device.color ? `Cor: ${device.color} • ` : ''}
                                                    Saúde da Bateria: <span style={{ color: theme.primary }}>{device.battery_health}%</span>
                                                </p>
                                            </div>

                                            {/* Passaporte Técnico Badge */}
                                            {device.technical_passport?.is_revised && (
                                                <div 
                                                    className="p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold border border-white/10"
                                                    style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
                                                >
                                                    <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: theme.primary }} />
                                                    <span>Garantia: {device.technical_passport.warranty_months || 6} Meses</span>
                                                </div>
                                            )}

                                            {/* Pricing Box */}
                                            <div className="p-4 bg-black/40 border border-slate-800 rounded-2xl space-y-1">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">PREÇO À VISTA (PIX)</span>
                                                <p className="text-2xl font-black tracking-tight" style={{ color: theme.primary }}>{formatCurrency(device.cash_price)}</p>
                                                {device.installment_price && (
                                                    <p className="text-xs font-bold" style={{ color: theme.accent }}>
                                                        ou 12x de {formatCurrency(device.installment_price / 12)} no cartão
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="space-y-2 pt-2">
                                            <button
                                                onClick={() => openWhatsAppInterest(`${device.brand} ${device.model} ${device.storage || ''}`, device.cash_price, `Bateria ${device.battery_health}%`)}
                                                className="w-full py-3 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:opacity-90"
                                                style={{ backgroundColor: theme.primary }}
                                            >
                                                <MessageSquare className="w-4 h-4 fill-current" />
                                                Comprar pelo WhatsApp
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}

                {/* ABA 2: GRID DE ACESSÓRIOS */}
                {activeTab === 'accessories' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredAccessories.length === 0 ? (
                            <div className="col-span-full py-16 text-center bg-[#111622] border border-dashed border-slate-800 rounded-3xl p-8 space-y-2">
                                <p className="text-sm font-bold text-slate-300">Nenhum acessório disponível no momento</p>
                            </div>
                        ) : (
                            filteredAccessories.map(item => (
                                <div key={item.id} className="bg-[#111622] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md flex flex-col justify-between">
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                                            {item.category || 'Acessório'}
                                        </span>
                                        <h3 className="font-bold text-sm text-white mt-2">{item.name}</h3>
                                        <p className="text-lg font-black text-emerald-400 mt-1">{formatCurrency(item.sale_price)}</p>
                                    </div>

                                    <button
                                        onClick={() => openWhatsAppInterest(item.name, item.sale_price)}
                                        className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Quero Comprar
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* FOOTER DE CONFIANÇA & REGULAMENTAÇÃO */}
                <footer className="pt-12 border-t border-slate-800 text-center space-y-4 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center justify-center gap-3 font-bold text-slate-400">
                        <span>{companyName}</span>
                        {companyCnpj && <span className="font-mono text-slate-400">• CNPJ: {companyCnpj}</span>}
                        {companyPhone && (
                            <a 
                                href={`https://wa.me/55${companyPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 hover:underline"
                                style={{ color: theme.primary }}
                            >
                                <MessageSquare className="w-3.5 h-3.5 fill-current" />
                                WhatsApp: {companyPhone}
                            </a>
                        )}
                    </div>
                    <p className="max-w-md mx-auto leading-relaxed">
                        Garantia e suporte técnico em {companyCity || 'nossa loja'}. Todos os direitos reservados.
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">Desenvolvido com tecnologia Nexus OS</p>
                </footer>
            </main>

            {/* MODAL DE GALERIA DE FOTOS DO APARELHO */}
            {selectedDeviceModal && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#111622] border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-5 relative my-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="font-black text-base text-white">
                                    {selectedDeviceModal.brand} {selectedDeviceModal.model}
                                </h3>
                                <p className="text-xs text-slate-400 font-semibold">{selectedDeviceModal.storage} • {selectedDeviceModal.color}</p>
                            </div>
                            <button onClick={() => setSelectedDeviceModal(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Photo Viewer */}
                        {Array.isArray(selectedDeviceModal.images) && selectedDeviceModal.images.length > 0 && (
                            <div className="space-y-3">
                                <div className="w-full h-64 bg-black rounded-2xl overflow-hidden border border-slate-800">
                                    <img
                                        src={selectedDeviceModal.images[activePhotoIndex]}
                                        alt="Foto do Aparelho"
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                {/* Thumbnails Selector */}
                                <div className="flex items-center justify-center gap-2">
                                    {selectedDeviceModal.images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActivePhotoIndex(idx)}
                                            className={cn(
                                                "w-12 h-12 rounded-xl overflow-hidden border-2 transition-all",
                                                activePhotoIndex === idx ? "border-emerald-400 scale-105" : "border-slate-800 opacity-60"
                                            )}
                                        >
                                            <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-[#0A0D14] border border-slate-800 rounded-2xl flex items-center justify-between">
                            <div>
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">À VISTA NO PIX</span>
                                <p className="text-2xl font-black text-emerald-400">{formatCurrency(selectedDeviceModal.cash_price)}</p>
                            </div>
                            <button
                                onClick={() => {
                                    openWhatsAppInterest(`${selectedDeviceModal.brand} ${selectedDeviceModal.model}`, selectedDeviceModal.cash_price)
                                    setSelectedDeviceModal(null)
                                }}
                                className="px-5 py-2.5 bg-emerald-500 text-black font-black rounded-xl text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center gap-1.5"
                            >
                                <MessageSquare className="w-4 h-4 fill-current" />
                                Enviar Mensagem
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function StoreCatalogPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = use(params)
    return <DynamicCatalogContent slug={resolvedParams.slug} />
}
