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

    // Announcement Bar Text
    const [announcementBarText, setAnnouncementBarText] = useState<string | null>(null)

    useEffect(() => {
        fetchCatalog()
    }, [slug])

    useEffect(() => {
        if (data?.settings && (data.settings as any).announcement_bar) {
            setAnnouncementBarText((data.settings as any).announcement_bar)
        }
        try {
            const raw = localStorage.getItem('nexus_catalog_settings')
            if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed.announcement_bar) setAnnouncementBarText(parsed.announcement_bar)
            }
        } catch (e) {}
    }, [data])

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

    const filteredDevices = allDevices.filter(d => {
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
        let text = `Olá! Vi no catálogo online da *${companyName}* o *${itemName}* por *${formatCurrency(price)}* à vista.`
        if (extraDetails) text += ` (${extraDetails})`
        text += `\n\nAinda está disponível para entrega ou retirada?`

        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
    }

    return (
        <div className="min-h-screen bg-[#0A0D14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
            {/* ANNOUNCEMENT BAR MARQUEE */}
            {announcementBarText && (
                <div className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-black py-2 px-4 text-center font-black text-xs uppercase tracking-wider shadow-md">
                    {announcementBarText}
                </div>
            )}

            {/* STICKY HEADER COM IDENTIDADE VISUAL */}
            <header className="sticky top-0 z-40 bg-[#0F1420]/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
                <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
                    {/* Logo + Store Name + CNPJ */}
                    <div className="flex items-center gap-3">
                        {companyLogo ? (
                            <div className="w-11 h-11 rounded-2xl overflow-hidden border border-emerald-500/30 p-0.5 bg-black shadow-lg shadow-emerald-500/10">
                                <img src={companyLogo} alt={companyName} className="w-full h-full object-cover rounded-xl" />
                            </div>
                        ) : (
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black font-black text-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                {companyName.substring(0, 2).toUpperCase()}
                            </div>
                        )}

                        <div>
                            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                                {companyName}
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            </h1>
                            <p className="text-[11px] text-slate-400 font-semibold flex flex-wrap items-center gap-2">
                                {companyCnpj && <span className="font-mono text-emerald-400">CNPJ: {companyCnpj}</span>}
                                {companyCity && <span>• {companyCity}{companyState ? `/${companyState}` : ''}</span>}
                            </p>
                        </div>
                    </div>

                    {/* WhatsApp Fast Button */}
                    {companyPhone && (
                        <button
                            onClick={() => openWhatsAppInterest('Atendimento Geral', 0)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
                        >
                            <MessageSquare className="w-4 h-4 fill-current" />
                            <span className="hidden sm:inline">Falar no</span> WhatsApp
                        </button>
                    )}
                </div>
            </header>

            {/* HERO SECTION DE ALTA CONVERSÃO */}
            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#121826] to-[#0D111A] border border-slate-800 p-6 md:p-10 shadow-2xl space-y-6">
                    {/* Background glow effects */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Catálogo Verificado • {companyName}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                                Garantia
                            </span>
                        </div>

                        <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white leading-tight max-w-2xl">
                            Celulares Selecionados com Garantia em <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{companyCity || 'nossa loja'}</span>.
                        </h2>
                        
                        <p className="text-xs md:text-sm text-slate-400 max-w-xl leading-relaxed">
                            Aparelhos seminovos de procedência garantida, com teste técnico completo, bateria saudável e parcelamento facilitado em até 12x.
                        </p>
                    </div>

                    {/* Trust badges strip */}
                    <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            Garantia
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            Entrega Via Motoboy
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            Até 12x no Cartão
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            Aparelhos 100% Originais
                        </div>
                    </div>
                </div>

                {/* FILTROS E PESQUISA */}
                <div className="bg-[#111622] border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4 shadow-xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-96">
                            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar modelo de iPhone, Galaxy..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-[#0A0D14] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500"
                            />
                        </div>

                        {/* Abas Celulares vs Acessórios */}
                        <div className="flex items-center gap-2 w-full md:w-auto bg-[#0A0D14] p-1.5 rounded-2xl border border-slate-800">
                            <button
                                onClick={() => setActiveTab('devices')}
                                className={cn(
                                    "flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'devices' ? "bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <Smartphone className="w-4 h-4" />
                                Celulares ({allDevices.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('accessories')}
                                className={cn(
                                    "flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'accessories' ? "bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Capas & Peças ({accessoriesList.length})
                            </button>
                        </div>
                    </div>

                    {/* Filtros Secundários por Marca e Faixa de Preço */}
                    {activeTab === 'devices' && (
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
                            {/* Marcas */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1">Marca:</span>
                                {['todas', 'Apple', 'Samsung', 'Xiaomi', 'Motorola'].map(brand => (
                                    <button
                                        key={brand}
                                        onClick={() => setSelectedBrand(brand)}
                                        className={cn(
                                            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                            selectedBrand === brand
                                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                                : "border-slate-800 bg-[#0A0D14] text-slate-400 hover:text-white"
                                        )}
                                    >
                                        {brand}
                                    </button>
                                ))}
                            </div>

                            {/* Faixa de Preço */}
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preço:</span>
                                <select
                                    value={priceRange}
                                    onChange={e => setPriceRange(e.target.value as any)}
                                    className="bg-[#0A0D14] border border-slate-800 text-slate-300 font-bold text-xs rounded-xl px-3 py-1.5 outline-none cursor-pointer"
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
                                        className="bg-[#111622] border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/5"
                                    >
                                        <div className="space-y-3">
                                            {/* Photo Preview / Thumb Header */}
                                            <div className="relative w-full h-48 bg-black/40 rounded-2xl overflow-hidden border border-slate-800/80 flex items-center justify-center group-hover:border-emerald-500/30 transition-all">
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
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/30 shadow-md">
                                                        {device.brand} • {device.storage || 'Estoque'}
                                                    </span>

                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-500/30 shadow-md">
                                                        {device.condition === 'novo_lacrado' ? 'NOVO' : 'SEMINOVO A+'}
                                                    </span>
                                                </div>

                                                {/* Quick View Button Overlay */}
                                                {hasPhotos && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDeviceModal(device)
                                                            setActivePhotoIndex(0)
                                                        }}
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-black text-white uppercase tracking-wider backdrop-blur-xs"
                                                    >
                                                        <Eye className="w-4 h-4 text-emerald-400" />
                                                        Ver Galeria de Fotos ({photos.length})
                                                    </button>
                                                )}
                                            </div>

                                            {/* Details Block */}
                                            <div>
                                                <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                                                    {device.brand} {device.model}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                    {device.color ? `Cor: ${device.color} • ` : ''}
                                                    Saúde da Bateria: <span className="text-emerald-400">{device.battery_health}%</span>
                                                </p>
                                            </div>

                                            {/* Passaporte Técnico Badge */}
                                            {device.technical_passport?.is_revised && (
                                                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-bold">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    <span>Garantia: {device.technical_passport.warranty_months || 6} Meses</span>
                                                </div>
                                            )}

                                            {/* Pricing Box */}
                                            <div className="p-4 bg-[#0A0D14] border border-slate-800 rounded-2xl space-y-1">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">PREÇO À VISTA (PIX)</span>
                                                <p className="text-2xl font-black text-emerald-400 tracking-tight">{formatCurrency(device.cash_price)}</p>
                                                {device.installment_price && (
                                                    <p className="text-xs font-bold text-amber-300">
                                                        ou 12x de {formatCurrency(device.installment_price / 12)} no cartão
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="space-y-2 pt-2">
                                            {hasPhotos && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedDeviceModal(device)
                                                        setActivePhotoIndex(0)
                                                    }}
                                                    className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                                                    Ver {photos.length} Fotos do Aparelho
                                                </button>
                                            )}

                                            <button
                                                onClick={() => openWhatsAppInterest(`${device.brand} ${device.model} ${device.storage || ''}`, device.cash_price, `Bateria ${device.battery_health}%`)}
                                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
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
                    <div className="flex items-center justify-center gap-3 font-bold text-slate-400">
                        <span>{companyName}</span>
                        {companyCnpj && <span className="font-mono text-emerald-400">• CNPJ: {companyCnpj}</span>}
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
