'use client'

import PageHeader, { primaryActionClass } from '@/components/ui/PageHeader'
import { useState, useEffect, Suspense } from 'react'
import { 
    Smartphone, Plus, Search, Filter, RefreshCw, QrCode, Wand2, 
    Trash2, Edit, ShieldCheck, DollarSign, Calculator, Globe, 
    Share2, ExternalLink, ArrowUpRight, Award, CheckCircle2, Copy, X
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { Device, DeviceTradeIn, CatalogSettings } from '@/types/devices'
import DeviceModal from '@/components/devices/DeviceModal'
import TradeInModal from '@/components/devices/TradeInModal'
import QRCodePrintModal from '@/components/devices/QRCodePrintModal'
import CatalogSettingsForm from '@/components/devices/CatalogSettingsForm'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { useFeature } from '@/components/plans/PlanProvider'
import UpgradeCard from '@/components/plans/UpgradeCard'

function DevicesContent() {
    const catalogIncluded = useFeature('catalog')
    const [activeTab, setActiveTab] = useState<'inventory' | 'tradein' | 'catalog'>('inventory')
    
    // Data State
    const [devices, setDevices] = useState<Device[]>([])
    const [tradeIns, setTradeIns] = useState<DeviceTradeIn[]>([])
    const [myStoreSlug, setMyStoreSlug] = useState('minha-loja')
    const [myShareUrl, setMyShareUrl] = useState('https://nexusgestor.com/loja/minha-loja')
    const [loading, setLoading] = useState(true)

    // Filter State
    const [selectedBrand, setSelectedBrand] = useState('todas')
    const [selectedStatus, setSelectedStatus] = useState('disponivel')
    const [searchQuery, setSearchQuery] = useState('')

    // Modal Controls
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
    const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null)

    const [isTradeInModalOpen, setIsTradeInModalOpen] = useState(false)

    const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false)
    const [selectedDeviceForQR, setSelectedDeviceForQR] = useState<Device | null>(null)

    // Mark as Sold & Cash Register Integration State
    const [deviceToSell, setDeviceToSell] = useState<Device | null>(null)
    const [isMarkAsSoldModalOpen, setIsMarkAsSoldModalOpen] = useState(false)
    const [salePrice, setSalePrice] = useState<number>(0)
    const [isSubmittingSale, setIsSubmittingSale] = useState(false)

    useEffect(() => {
        fetchDevices()
        fetchTradeIns()
        fetchMyStoreCatalogInfo()
    }, [selectedBrand, selectedStatus, searchQuery])

    const fetchMyStoreCatalogInfo = async () => {
        try {
            const res = await fetch('/api/catalog/me')
            if (res.ok) {
                const info = await res.json()
                if (info.slug) {
                    setMyStoreSlug(info.slug)
                    setMyShareUrl(`https://nexusgestor.com/loja/${info.slug}`)
                }
            }
        } catch (e) {
            console.error('Erro ao buscar informações do catálogo')
        }
    }

    const fetchDevices = async () => {
        setLoading(true)
        let remoteDevices: Device[] = []
        try {
            const url = new URL('/api/devices', window.location.origin)
            if (selectedBrand !== 'todas') url.searchParams.set('brand', selectedBrand)
            if (selectedStatus !== 'todos') url.searchParams.set('status', selectedStatus)
            if (searchQuery) url.searchParams.set('search', searchQuery)

            const res = await fetch(url.toString())
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) remoteDevices = data
            }
        } catch (error) {
            console.error('Error fetching devices:', error)
        }

        try {
            const localRaw = typeof window !== 'undefined' ? localStorage.getItem('nexus_devices') : null
            const localItems: Device[] = localRaw ? JSON.parse(localRaw) : []
            const remoteIds = new Set(remoteDevices.map(d => d.id))
            const uniqueLocal = localItems.filter(l => !remoteIds.has(l.id))
            setDevices([...remoteDevices, ...uniqueLocal])
        } catch (e) {
            setDevices(remoteDevices)
        } finally {
            setLoading(false)
        }
    }

    const fetchTradeIns = async () => {
        let remoteTradeIns: DeviceTradeIn[] = []
        try {
            const res = await fetch('/api/devices/trade-in')
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) remoteTradeIns = data
            }
        } catch (error) {
            console.error('Error fetching trade-ins:', error)
        }

        try {
            const localRaw = typeof window !== 'undefined' ? localStorage.getItem('nexus_trade_ins') : null
            const localItems: DeviceTradeIn[] = localRaw ? JSON.parse(localRaw) : []
            const remoteIds = new Set(remoteTradeIns.map(t => t.id))
            const uniqueLocal = localItems.filter(l => !remoteIds.has(l.id))
            setTradeIns([...remoteTradeIns, ...uniqueLocal])
        } catch (e) {
            setTradeIns(remoteTradeIns)
        }
    }

    const handleDeleteDevice = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este aparelho do estoque?')) return

        if (id.startsWith('local_')) {
            try {
                const localRaw = localStorage.getItem('nexus_devices')
                const localItems: Device[] = localRaw ? JSON.parse(localRaw) : []
                const updated = localItems.filter(d => d.id !== id)
                localStorage.setItem('nexus_devices', JSON.stringify(updated))
                setDevices(prev => prev.filter(d => d.id !== id))
                toast.success('Aparelho excluído!')
            } catch (e) {
                console.error('Erro ao excluir aparelho do armazenamento local')
            }
            return
        }

        try {
            const res = await fetch(`/api/devices?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Aparelho excluído!')
                setDevices(prev => prev.filter(d => d.id !== id))
            } else {
                toast.error('Erro ao excluir aparelho.')
            }
        } catch (error) {
            toast.error('Erro de conexão.')
        }
    }

    const handleOpenQRModal = (device: Device) => {
        setSelectedDeviceForQR(device)
        setIsQRCodeModalOpen(true)
    }

    const handleOpenMarkAsSold = (device: Device) => {
        setDeviceToSell(device)
        setSalePrice(Number(device.cash_price))
        setIsMarkAsSoldModalOpen(true)
    }

    const handleConfirmSale = async () => {
        if (!deviceToSell) return
        setIsSubmittingSale(true)

        try {
            // 1. Update device status to 'vendido'
            if (!deviceToSell.id.startsWith('local_')) {
                await fetch('/api/devices', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: deviceToSell.id,
                        status: 'vendido'
                    })
                })
            }

            // Update local state
            setDevices(prev => prev.map(d => d.id === deviceToSell.id ? { ...d, status: 'vendido' } : d))
            
            try {
                const localRaw = localStorage.getItem('nexus_devices')
                if (localRaw) {
                    const localItems: Device[] = JSON.parse(localRaw)
                    const updated = localItems.map(d => d.id === deviceToSell.id ? { ...d, status: 'vendido' } : d)
                    localStorage.setItem('nexus_devices', JSON.stringify(updated))
                }
            } catch (e) {}

            // 2. Post transaction to current open cash register if available
            try {
                const regRes = await fetch('/api/cash-registers/current')
                if (regRes.ok) {
                    const reg = await regRes.json()
                    if (reg && reg.id) {
                        await fetch('/api/cash-transactions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                cash_register_id: reg.id,
                                type: 'entry',
                                amount: Number(salePrice),
                                description: `Venda de Aparelho: ${deviceToSell.brand} ${deviceToSell.model} (${deviceToSell.storage || ''}) - IMEI: ${deviceToSell.imei_1 || 'N/A'}`,
                                category: 'Venda de Celular'
                            })
                        })
                    }
                }
            } catch (e) {
                console.error('Error recording sale in cash register:', e)
            }

            toast.success(`Aparelho marcado como VENDIDO e lançado no Caixa (${formatCurrency(salePrice)})!`)
            setIsMarkAsSoldModalOpen(false)
            setDeviceToSell(null)
        } catch (err) {
            toast.error('Erro ao processar venda.')
        } finally {
            setIsSubmittingSale(false)
        }
    }

    // KPIs Calculations
    const totalAvailable = devices.filter(d => d.status === 'disponivel').length
    const totalInventoryValue = devices
        .filter(d => d.status === 'disponivel')
        .reduce((sum, d) => sum + Number(d.cash_price || 0), 0)

    const totalRevised = devices.filter(d => d.technical_passport?.is_revised).length

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <Header title="Gestão de Aparelhos Celulares" subtitle="Estoque de Novos e Seminovos, Avaliação de Troca e Catálogo Digital" />

            <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 space-y-6 max-w-7xl mx-auto">
                <PageHeader
                    actions={<>
                            <button
                                onClick={() => setIsTradeInModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400 text-[15px] font-semibold hover:bg-amber-500/18 transition-colors shrink-0"
                            >
                                <Calculator className="w-4 h-4" />
                                Avaliar Usado (Trade-In)
                            </button>

                            <button
 onClick={() => {
 setDeviceToEdit(null)
 setIsDeviceModalOpen(true)
 }}
 className={primaryActionClass}
 >
                                <Plus className="w-4 h-4" />
                                Adicionar Aparelho
                            </button>
                    </>}
                />

                {/* Top Header & Navigation Tabs */}
                <div className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-6">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 bg-background border border-border rounded-2xl space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground">Aparelhos Disponíveis</span>
                            <p className="text-2xl font-black text-foreground">{totalAvailable} unidades</p>
                        </div>

                        <div className="p-4 bg-background border border-border rounded-2xl space-y-1">
                            <span className="text-xs font-semibold text-emerald-400">Valor em Estoque (À Vista)</span>
                            <p className="text-2xl font-black text-emerald-400">{formatCurrency(totalInventoryValue)}</p>
                        </div>

                        <div className="p-4 bg-background border border-border rounded-2xl space-y-1">
                            <span className="text-xs font-semibold text-primary">Seminovos Com Passaporte Técnico</span>
                            <p className="text-2xl font-black text-primary">{totalRevised} revisados</p>
                        </div>
                    </div>

                    {/* Tabs Bar */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                activeTab === 'inventory' ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Smartphone className="w-4 h-4" />
                            Estoque de Aparelhos ({devices.length})
                        </button>

                        <button
                            onClick={() => setActiveTab('tradein')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                activeTab === 'tradein' ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Calculator className="w-4 h-4" />
                            Avaliações Trade-In ({tradeIns.length})
                        </button>

                        <button
                            onClick={() => setActiveTab('catalog')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                activeTab === 'catalog' ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Globe className="w-4 h-4" />
                            Catálogo Digital Público
                        </button>
                    </div>
                </div>

                {/* TAB 1: ESTOQUE DE APARELHOS */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Filters Bar */}
                        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="relative w-full md:w-80">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar por modelo, IMEI ou serial..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-background border border-border rounded-2xl pl-9 pr-4 py-2 text-xs font-bold outline-none"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-2xl text-xs">
                                    <span className="text-muted-foreground font-bold">Marca:</span>
                                    <select
                                        value={selectedBrand}
                                        onChange={e => setSelectedBrand(e.target.value)}
                                        className="bg-transparent font-bold outline-none cursor-pointer"
                                    >
                                        <option value="todas">Todas as Marcas</option>
                                        <option value="Apple">Apple</option>
                                        <option value="Samsung">Samsung</option>
                                        <option value="Xiaomi">Xiaomi</option>
                                        <option value="Motorola">Motorola</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-2xl text-xs">
                                    <span className="text-muted-foreground font-bold">Status:</span>
                                    <select
                                        value={selectedStatus}
                                        onChange={e => setSelectedStatus(e.target.value)}
                                        className="bg-transparent font-bold outline-none cursor-pointer"
                                    >
                                        <option value="disponivel">Disponíveis</option>
                                        <option value="vendido">Vendidos</option>
                                        <option value="reservado">Reservados</option>
                                        <option value="todos">Todos os Status</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Devices Grid */}
                        {loading ? (
                            <div className="py-16 flex justify-center">
                                <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-30" />
                            </div>
                        ) : devices.length === 0 ? (
                            <div className="py-20 text-center bg-card border border-dashed border-border rounded-2xl p-8 space-y-3">
                                <Smartphone className="w-10 h-10 text-muted-foreground mx-auto" />
                                <h3 className="font-bold text-base">Nenhum aparelho encontrado</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    Clique em <strong>"+ Adicionar Aparelho"</strong> para registrar celulares novos ou seminovos no seu estoque.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {devices.map(device => (
                                    <div key={device.id} className="bg-card border border-border rounded-2xl p-6 space-y-4 flex flex-col justify-between hover:border-primary/50 transition-all group">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                                    {device.brand} • {device.storage || 'Estoque'}
                                                </span>

                                                <span className={cn(
                                                    "text-xs font-bold px-2 py-0.5 rounded-md",
                                                    device.status === 'disponivel' ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {device.status}
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-black group-hover:text-primary transition-colors">
                                                    {device.model}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {device.color ? `Cor: ${device.color} • ` : ''}
                                                    {device.condition === 'novo_lacrado' ? 'Novo Lacrado' : `Seminovo (Bateria ${device.battery_health}%)`}
                                                </p>
                                            </div>

                                            {/* Technical Passport Badge */}
                                            {device.technical_passport?.is_revised && (
                                                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-bold">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    <span>Passaporte Técnico: Garantia de {device.technical_passport.warranty_months || 6} Meses</span>
                                                </div>
                                            )}

                                            {/* Preços */}
                                            <div className="p-3 bg-muted/30 border border-border rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-semibold text-muted-foreground">À VISTA (PIX)</span>
                                                    <p className="text-lg font-black text-emerald-400">{formatCurrency(device.cash_price)}</p>
                                                </div>

                                                {device.installment_price && (
                                                    <div className="text-right">
                                                        <span className="text-xs font-semibold text-muted-foreground">PARCELADO 12X</span>
                                                        <p className="text-xs font-bold text-amber-300">12x de {formatCurrency(device.installment_price / 12)}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* IMEI Display */}
                                            {device.imei_1 && (
                                                <div className="text-[11px] font-mono text-muted-foreground bg-background px-3 py-1.5 rounded-xl border border-border flex items-center justify-between">
                                                    <span>IMEI: {device.imei_1}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Actions */}
                                        <div className="flex items-center gap-2 pt-3 border-t border-border">
                                            {device.status === 'disponivel' && (
                                                <button
                                                    onClick={() => handleOpenMarkAsSold(device)}
                                                    className="flex-1 py-2 px-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                    title="Marcar como Vendido e Lançar no Caixa"
                                                >
                                                    <DollarSign className="w-4 h-4" />
                                                    Vendido (Caixa)
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleOpenQRModal(device)}
                                                className="p-2.5 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-all"
                                                title="Etiqueta QR Code"
                                            >
                                                <QrCode className="w-4 h-4" />
                                            </button>

                                            <Link
                                                href={`/studio?topic=${encodeURIComponent(`Venda de ${device.brand} ${device.model}`)}`}
                                                className="p-2.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white rounded-xl text-xs font-bold transition-all"
                                                title="Criar Anúncio no Studio AI"
                                            >
                                                <Wand2 className="w-4 h-4" />
                                            </Link>

                                            <button
                                                onClick={() => {
                                                    setDeviceToEdit(device)
                                                    setIsDeviceModalOpen(true)
                                                }}
                                                className="p-2.5 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-all"
                                                title="Editar Aparelho"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteDevice(device.id)}
                                                className="p-2.5 text-muted-foreground hover:text-rose-500 rounded-xl transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: AVALIAÇÕES TRADE-IN */}
                {activeTab === 'tradein' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-amber-400" />
                                Histórico de Avaliações Trade-In ({tradeIns.length})
                            </h2>

                            <button
 onClick={() => setIsTradeInModalOpen(true)}
 className="px-4 py-2 bg-amber-500 text-black rounded-xl text-xs font-semibold hover:bg-amber-400 transition-all flex items-center gap-1.5"
 >
                                <Plus className="w-4 h-4" />
                                Nova Avaliação
                            </button>
                        </div>

                        {tradeIns.length === 0 ? (
                            <div className="py-16 text-center bg-card border border-dashed border-border rounded-2xl p-8 space-y-2">
                                <p className="text-sm font-bold">Nenhuma avaliação registrada</p>
                                <p className="text-xs text-muted-foreground">Avalie aparelhos usados trazidos pelos seus clientes e calcule o valor exato de abate na compra de um novo.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tradeIns.map(item => (
                                    <div key={item.id} className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-md">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                {item.status}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-base">{item.device_model}</h3>
                                            <p className="text-xs text-muted-foreground">Cliente: {item.customer_name} {item.customer_phone ? `(${item.customer_phone})` : ''}</p>
                                        </div>

                                        <div className="p-3 bg-muted/30 rounded-xl flex items-center justify-between">
                                            <span className="text-xs font-bold text-muted-foreground">Valor Oferecido:</span>
                                            <span className="text-base font-black text-amber-400">{formatCurrency(item.offered_price)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: CATÁLOGO DIGITAL PÚBLICO & CONFIGURAÇÃO VISUAL */}
                {activeTab === 'catalog' && !catalogIncluded && <UpgradeCard feature="catalog" />}
                {activeTab === 'catalog' && catalogIncluded && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Top Bar Banner with Quick Link */}
                        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary" />
                                    Seu Catálogo Digital Público & Identidade Visual
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Personalize as 4 cores do tema, mensagens e compartilhe o link exclusivo com seus clientes.</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(myShareUrl)
                                        toast.success('Link do catálogo copiado!')
                                    }}
                                    className="px-4 py-2.5 bg-background border border-border hover:border-primary/50 text-foreground rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    <Copy className="w-4 h-4 text-primary" />
                                    Copiar Link
                                </button>

                                <Link
 href={`/loja/${myStoreSlug}`}
 target="_blank"
 className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2"
 >
                                    Abrir Catálogo Público
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Complete Form & Live Preview */}
                        <CatalogSettingsForm
                            initialSlug={myStoreSlug}
                            onSaveSuccess={() => {
                                fetchMyStoreCatalogInfo()
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Modals */}
            <DeviceModal
                isOpen={isDeviceModalOpen}
                onClose={() => setIsDeviceModalOpen(false)}
                onSave={fetchDevices}
                deviceToEdit={deviceToEdit}
            />

            <TradeInModal
                isOpen={isTradeInModalOpen}
                onClose={() => setIsTradeInModalOpen(false)}
                onSaveSuccess={fetchTradeIns}
            />

            <QRCodePrintModal
                isOpen={isQRCodeModalOpen}
                onClose={() => setIsQRCodeModalOpen(false)}
                device={selectedDeviceForQR}
            />

            {/* MODAL DE CONFIRMAÇÃO DE VENDA & LANÇAMENTO NO CAIXA */}
            {isMarkAsSoldModalOpen && deviceToSell && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-base">Marcar como Vendido</h3>
                                    <p className="text-xs text-muted-foreground">Lançar receita no Caixa da Loja</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMarkAsSoldModalOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-all">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-1">
                            <span className="text-xs font-semibold text-primary">{deviceToSell.brand}</span>
                            <h4 className="font-black text-base">{deviceToSell.model} ({deviceToSell.storage || 'Estoque'})</h4>
                            <p className="text-xs text-muted-foreground">{deviceToSell.color ? `Cor: ${deviceToSell.color}` : ''}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground block">Valor Final de Venda (R$)</label>
                                <input
                                    type="number"
                                    value={salePrice}
                                    onChange={e => setSalePrice(Number(e.target.value))}
                                    className="w-full bg-background border border-border rounded-2xl p-3 text-lg font-black text-emerald-400 outline-none"
                                />
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-300">
                                ℹ️ Ao confirmar, este aparelho terá o status alterado para <strong>Vendido</strong>, o valor será registrado como <strong>Receita no Caixa Aberto</strong> e ele <strong>sumirá automaticamente do seu catálogo público</strong>.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setIsMarkAsSoldModalOpen(false)}
                                className="flex-1 py-3 bg-muted hover:bg-muted/80 rounded-2xl text-xs font-bold transition-all"
                            >
                                Cancelar
                            </button>

                            <button
 disabled={isSubmittingSale}
 onClick={handleConfirmSale}
 className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5"
 >
                                {isSubmittingSale ? 'Processando...' : 'Confirmar Venda'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function DevicesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-30" />
            </div>
        }>
            <DevicesContent />
        </Suspense>
    )
}
