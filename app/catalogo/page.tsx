'use client'

import { useState, useEffect, Suspense } from 'react'
import { 
    Smartphone, Search, ShoppingBag, MessageSquare, ShieldCheck, 
    Filter, RefreshCw, Zap, Check, ArrowRight, ExternalLink, Star
} from 'lucide-react'
import { Device } from '@/types/devices'
import { formatCurrency, cn } from '@/lib/utils'

interface PublicCatalogData {
    settings: {
        catalog_title?: string
        whatsapp_number?: string
        companies?: {
            name: string
            city: string
            phone: string
            logo_url?: string
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

function PublicCatalogContent() {
    const [data, setData] = useState<PublicCatalogData | null>(null)
    const [loading, setLoading] = useState(true)

    const [activeTab, setActiveTab] = useState<'devices' | 'accessories'>('devices')
    const [selectedBrand, setSelectedBrand] = useState('todas')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchCatalog()
    }, [])

    const fetchCatalog = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/catalog/default')
            if (res.ok) {
                const catalogData = await res.json()
                setData(catalogData)
            }
        } catch (error) {
            console.error('Error loading public catalog:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-40" />
            </div>
        )
    }

    const companyName = data?.settings?.companies?.name || 'Assistência Técnica Especializada'
    const companyCity = data?.settings?.companies?.city || 'Nossa Cidade'
    const whatsapp = data?.settings?.whatsapp_number || data?.settings?.companies?.phone || ''

    const devicesList = data?.devices || []
    const accessoriesList = data?.inventory || []

    const filteredDevices = devicesList.filter(d => {
        if (selectedBrand !== 'todas' && d.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false
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

    const openWhatsAppInterest = (itemName: string, price: number) => {
        const cleanPhone = whatsapp.replace(/\D/g, '')
        const msg = encodeURIComponent(`Olá! Vi no catálogo online que vocês têm o *${itemName}* por *${formatCurrency(price)}* à vista. Ainda está disponível para compra?`)
        window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank')
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 font-sans">
            {/* Header público da loja */}
            <header className="bg-card border-b border-border sticky top-0 z-30 shadow-md backdrop-blur-md bg-card/90">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary text-black rounded-2xl font-black text-lg">
                            📱
                        </div>
                        <div>
                            <h1 className="text-base font-black tracking-tight">{companyName}</h1>
                            <p className="text-xs text-muted-foreground font-medium">Catálogo de Celulares & Produtos em {companyCity}</p>
                        </div>
                    </div>

                    {whatsapp && (
                        <a
                            href={`https://wa.me/55${whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                            <MessageSquare className="w-4 h-4 fill-current" />
                            <span className="hidden sm:inline">Falar no</span> WhatsApp
                        </a>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Hero Banner */}
                <div className="bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent border border-primary/20 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                        Garantia Total & Nota Fiscal
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                        Encontre seu próximo celular revisado com o melhor preço da região.
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                        Todos os nossos seminovos passam por inspeção de 20 pontos na bancada, com bateria testada e garantia oficial de loja.
                    </p>
                </div>

                {/* Filtros e Busca */}
                <div className="bg-card border border-border rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                    {/* Search Input */}
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar modelo de celular ou produto..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-background border border-border rounded-2xl pl-9 pr-4 py-2 text-xs font-bold outline-none"
                        />
                    </div>

                    {/* Tabs Celulares vs Acessórios */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('devices')}
                            className={cn(
                                "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                activeTab === 'devices' ? "bg-primary text-black font-black" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Smartphone className="w-4 h-4" />
                            Celulares ({devicesList.length})
                        </button>

                        <button
                            onClick={() => setActiveTab('accessories')}
                            className={cn(
                                "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                activeTab === 'accessories' ? "bg-primary text-black font-black" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Capas & Acessórios ({accessoriesList.length})
                        </button>
                    </div>
                </div>

                {/* Filtro por Marca (Quando na aba Celulares) */}
                {activeTab === 'devices' && (
                    <div className="flex flex-wrap items-center gap-2">
                        {['todas', 'Apple', 'Samsung', 'Xiaomi', 'Motorola'].map(brand => (
                            <button
                                key={brand}
                                onClick={() => setSelectedBrand(brand)}
                                className={cn(
                                    "px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border",
                                    selectedBrand === brand ? "bg-card border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {brand}
                            </button>
                        ))}
                    </div>
                )}

                {/* CONTEÚDO 1: CELULARES */}
                {activeTab === 'devices' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDevices.length === 0 ? (
                            <div className="col-span-full py-16 text-center bg-card border border-dashed border-border rounded-3xl p-8 space-y-2">
                                <p className="text-sm font-bold">Nenhum celular encontrado com os filtros selecionados</p>
                                <p className="text-xs text-muted-foreground">Tente buscar por outro modelo ou selecione 'Todas as Marcas'.</p>
                            </div>
                        ) : (
                            filteredDevices.map(device => (
                                <div key={device.id} className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between hover:border-primary/50 transition-all group">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                                {device.brand} • {device.storage || 'Estoque'}
                                            </span>

                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                {device.condition === 'novo_lacrado' ? 'Novo Lacrado' : 'Seminovo'}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-black group-hover:text-primary transition-colors">
                                                {device.model}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {device.color ? `Cor: ${device.color} • ` : ''}
                                                Bateria {device.battery_health}%
                                            </p>
                                        </div>

                                        {/* Passaporte de Garantia */}
                                        {device.technical_passport?.is_revised && (
                                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-bold">
                                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                                <span>Revisado na Bancada • {device.technical_passport.warranty_months || 6} Meses de Garantia</span>
                                            </div>
                                        )}

                                        {/* Preço & Parcelamento */}
                                        <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">À VISTA NO PIX</span>
                                            <p className="text-2xl font-black text-emerald-400">{formatCurrency(device.cash_price)}</p>
                                            {device.installment_price && (
                                                <p className="text-xs font-bold text-amber-300">
                                                    ou 12x de {formatCurrency(device.installment_price / 12)} no cartão
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => openWhatsAppInterest(`${device.brand} ${device.model} ${device.storage || ''}`, device.cash_price)}
                                        className="w-full py-3 bg-emerald-500 text-black rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 mt-4"
                                    >
                                        <MessageSquare className="w-4 h-4 fill-current" />
                                        Tenho Interesse / WhatsApp
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* CONTEÚDO 2: ACESSÓRIOS DO ESTOQUE */}
                {activeTab === 'accessories' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {filteredAccessories.length === 0 ? (
                            <div className="col-span-full py-16 text-center bg-card border border-dashed border-border rounded-3xl p-8 space-y-2">
                                <p className="text-sm font-bold">Nenhum acessório encontrado</p>
                            </div>
                        ) : (
                            filteredAccessories.map(item => (
                                <div key={item.id} className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-md flex flex-col justify-between">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                            {item.category || 'Acessório'}
                                        </span>
                                        <h3 className="font-bold text-sm text-foreground mt-2">{item.name}</h3>
                                        <p className="text-base font-black text-emerald-400 mt-1">{formatCurrency(item.sale_price)}</p>
                                    </div>

                                    <button
                                        onClick={() => openWhatsAppInterest(item.name, item.sale_price)}
                                        className="w-full py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Quar pelo WhatsApp
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

export default function PublicCatalogPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-30" />
            </div>
        }>
            <PublicCatalogContent />
        </Suspense>
    )
}
