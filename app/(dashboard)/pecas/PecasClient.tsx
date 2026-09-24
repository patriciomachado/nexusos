'use client'

import PageHeader, { primaryActionClass } from '@/components/ui/PageHeader'
import { useState, useMemo } from 'react'
import {
    Wrench, Package, TrendingUp, TrendingDown, AlertTriangle,
    Search, BarChart3, Star, ArrowUpRight, CircleDot,
    ShoppingCart, Zap, Award, PackageOpen, AlertCircle,
    ChevronUp, ChevronDown, Minus, Info, Plus, Smartphone
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface RankEntry {
    name: string
    totalQty: number
    totalRevenue: number
    osCount: number
    inventoryItemId: string | null
    inventoryStock: number | null
    minimumStock: number | null
    costPrice: number | null
}

interface InventoryItem {
    id: string
    name: string
    quantity_in_stock: number
    minimum_quantity: number
    cost_price: number
    sale_price: number
    sku: string | null
    category_id: string | null
}

interface DeviceEntry {
    model: string
    count: number
}

interface Summary {
    periodTotalQty: number
    periodTotalRevenue: number
    totalInventoryItems: number
    lowStockCount: number
    unregisteredCount: number
    topPart: string | null
    allTimeTotalQty: number
    allTimeTotalRevenue: number
}

interface PecasClientProps {
    ranking: RankEntry[]
    inventoryItems: InventoryItem[]
    lowStockItems: InventoryItem[]
    unregisteredParts: RankEntry[]
    deviceRanking: DeviceEntry[]
    summary: Summary
}

const STAT_CARD_STYLES = [
    { gradient: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/15', icon: 'text-blue-400', accent: 'bg-blue-500' },
    { gradient: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/15', icon: 'text-emerald-400', accent: 'bg-emerald-500' },
    { gradient: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/15', icon: 'text-amber-400', accent: 'bg-amber-500' },
    { gradient: 'from-rose-500/10 to-rose-600/5', border: 'border-rose-500/15', icon: 'text-rose-400', accent: 'bg-rose-500' },
    { gradient: 'from-violet-500/10 to-violet-600/5', border: 'border-violet-500/15', icon: 'text-violet-400', accent: 'bg-violet-500' },
    { gradient: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-500/15', icon: 'text-cyan-400', accent: 'bg-cyan-500' },
]

export default function PecasClient({
    ranking,
    inventoryItems,
    lowStockItems,
    unregisteredParts,
    deviceRanking,
    summary,
}: PecasClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<'ranking' | 'estoque' | 'alertas'>('ranking')
    const [sortBy, setSortBy] = useState<'qty' | 'revenue' | 'name'>('qty')

    const filteredRanking = useMemo(() => {
        let list = [...ranking]
        if (searchQuery) {
            list = list.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
        }
        if (sortBy === 'qty') list.sort((a, b) => b.totalQty - a.totalQty)
        if (sortBy === 'revenue') list.sort((a, b) => b.totalRevenue - a.totalRevenue)
        if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
        return list
    }, [ranking, searchQuery, sortBy])

    const filteredInventory = useMemo(() => {
        if (!searchQuery) return inventoryItems
        return inventoryItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [inventoryItems, searchQuery])

    const maxQty = ranking[0]?.totalQty || 1
    const top5 = ranking.slice(0, 5)
    const bottom5 = ranking.length > 5 ? ranking.slice(-5).reverse() : []

    const statsCards = [
        {
            label: 'Peças Usadas (30d)',
            value: summary.periodTotalQty.toString(),
            sub: `${summary.allTimeTotalQty} no total`,
            icon: Wrench,
        },
        {
            label: 'Receita com Peças (30d)',
            value: formatCurrency(summary.periodTotalRevenue),
            sub: `${formatCurrency(summary.allTimeTotalRevenue)} no total`,
            icon: TrendingUp,
        },
        {
            label: 'Itens em Estoque',
            value: summary.totalInventoryItems.toString(),
            sub: 'produtos cadastrados',
            icon: Package,
        },
        {
            label: 'Estoque Crítico',
            value: summary.lowStockCount.toString(),
            sub: 'abaixo do mínimo',
            icon: AlertTriangle,
        },
        {
            label: 'Peça Mais Usada',
            value: summary.topPart ? summary.topPart.slice(0, 18) + (summary.topPart.length > 18 ? '…' : '') : '—',
            sub: `${ranking[0]?.totalQty || 0} usos em 30d`,
            icon: Award,
        },
        {
            label: 'Sem Cadastro',
            value: summary.unregisteredCount.toString(),
            sub: 'peças usadas em OS sem estoque',
            icon: AlertCircle,
        },
    ]

    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 space-y-6 max-w-screen-2xl mx-auto">

            {/* Page Header */}
            <PageHeader
                eyebrow="Inteligência de Consumo"
                title="Peças & Componentes"
                subtitle="Acompanhe o consumo de peças extraído automaticamente das Ordens de Serviço — inclusive peças sem cadastro no estoque."
                actions={<>
<Link
 href="/inventory/new"
 className={primaryActionClass}
 >
                    <Plus className="w-4 h-4" />
                    Adicionar ao Estoque
                </Link>
                </>}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {statsCards.map((card, i) => {
                    const style = STAT_CARD_STYLES[i]
                    const Icon = card.icon
                    return (
                        <div
                            key={card.label}
                            className={cn(
                                'rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-300 group',
                                style.gradient, style.border
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <Icon className={cn('w-5 h-5', style.icon)} />
                                <div className={cn('w-1.5 h-1.5 rounded-full', style.accent)} />
                            </div>
                            <div>
                                <p className="text-xl font-black text-foreground leading-none">{card.value}</p>
                                <p className="text-xs text-muted-foreground mt-1.5 font-bold">{card.label}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Top / Bottom 5 Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Most Used */}
                <div className="rounded-2xl bg-card/30 border border-white/[0.04] p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Mais Usadas</h3>
                            <p className="text-[11px] text-muted-foreground">Últimos 30 dias</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {top5.length === 0 ? (
                            <div className="h-28 flex flex-col items-center justify-center text-muted-foreground">
                                <PackageOpen className="w-6 h-6 mb-2" />
                                <span className="text-xs font-bold">Nenhum dado no período</span>
                            </div>
                        ) : top5.map((part, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                                <span className={cn(
                                    'w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0',
                                    i === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    i === 1 ? 'bg-zinc-400/15 text-zinc-400 border border-zinc-500/25' :
                                    i === 2 ? 'bg-orange-700/20 text-orange-500 border border-orange-700/30' :
                                    'bg-muted/40 text-muted-foreground border border-border/60'
                                )}>#{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-foreground truncate pr-2">{part.name}</span>
                                        <span className="text-[11px] font-semibold text-emerald-400 shrink-0">{part.totalQty}x</span>
                                    </div>
                                    <div className="h-1.5 bg-foreground/[0.03] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${(part.totalQty / maxQty) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[11px] text-muted-foreground">{formatCurrency(part.totalRevenue)} gerado</span>
                                        {part.inventoryItemId ? (
                                            <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Em Estoque</span>
                                        ) : (
                                            <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Sem Cadastro</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Least Used */}
                <div className="rounded-2xl bg-card/30 border border-white/[0.04] p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <TrendingDown className="w-4 h-4 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Menos Usadas</h3>
                            <p className="text-[11px] text-muted-foreground">Últimos 30 dias</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {bottom5.length === 0 ? (
                            <div className="h-28 flex flex-col items-center justify-center text-muted-foreground">
                                <PackageOpen className="w-6 h-6 mb-2" />
                                <span className="text-xs font-bold">Dados insuficientes</span>
                            </div>
                        ) : bottom5.map((part, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0 bg-muted/40 text-muted-foreground border border-border/60">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-foreground truncate pr-2">{part.name}</span>
                                        <span className="text-[11px] font-semibold text-rose-400 shrink-0">{part.totalQty}x</span>
                                    </div>
                                    <div className="h-1.5 bg-foreground/[0.03] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${Math.max(4, (part.totalQty / maxQty) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-[11px] text-muted-foreground">{formatCurrency(part.totalRevenue)} gerado</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Device Ranking */}
            {deviceRanking.length > 0 && (
                <div className="rounded-2xl bg-card/30 border border-white/[0.04] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                <Smartphone className="w-4 h-4 text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Aparelhos Mais Reparados</h3>
                                <p className="text-[11px] text-muted-foreground">Baseado no campo &quot;Equipamento&quot; das OS — últimos 30 dias</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {deviceRanking.length} modelo{deviceRanking.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {deviceRanking.slice(0, 9).map((device, i) => {
                            const maxCount = deviceRanking[0].count
                            const pct = Math.round((device.count / maxCount) * 100)
                            return (
                                <div key={i} className="bg-violet-500/5 border border-violet-500/10 rounded-xl px-4 py-3 space-y-2 hover:bg-violet-500/10 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={cn(
                                                'w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0',
                                                i === 0 ? 'bg-amber-500/20 text-amber-400' :
                                                i === 1 ? 'bg-zinc-400/15 text-zinc-300' :
                                                i === 2 ? 'bg-orange-700/20 text-orange-500' :
                                                'bg-violet-500/15 text-violet-400'
                                            )}>#{i + 1}</span>
                                            <p className="text-xs font-bold text-foreground truncate">{device.model}</p>
                                        </div>
                                        <span className="text-[11px] font-semibold text-violet-400 shrink-0">{device.count}x</span>
                                    </div>
                                    <div className="h-1.5 bg-foreground/[0.03] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {deviceRanking.length === 0 && (
                        <div className="h-24 flex flex-col items-center justify-center text-muted-foreground">
                            <Smartphone className="w-6 h-6 mb-2" />
                            <p className="text-xs font-bold">Nenhum aparelho registrado nas OS do período</p>
                            <p className="text-[11px] mt-1">Preencha o campo &quot;Equipamento&quot; ao criar uma OS</p>
                        </div>
                    )}
                </div>
            )}

            {/* Alerts — Unregistered Parts */}
            {unregisteredParts.length > 0 && (
                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                            <Info className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-amber-300">Peças usadas em OS sem estoque cadastrado</h3>
                            <p className="text-[11px] text-amber-400/60">Estas peças foram registradas manualmente nas OS. Considere adicioná-las ao estoque.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unregisteredParts.slice(0, 6).map((part, i) => (
                            <div key={i} className="flex items-center justify-between bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{part.name}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{part.totalQty} uso{part.totalQty !== 1 ? 's' : ''} · {formatCurrency(part.totalRevenue)}</p>
                                </div>
                                <Link
 href="/inventory/new"
 className="shrink-0 ml-3 text-[13px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
 >
                                    Cadastrar
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-rose-300">Estoque Crítico</h3>
                            <p className="text-[11px] text-rose-400/60">{lowStockItems.length} item{lowStockItems.length !== 1 ? 'ns' : ''} abaixo do estoque mínimo</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {lowStockItems.slice(0, 8).map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-rose-500/5 border border-rose-500/15 rounded-xl px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                                    <p className="text-[11px] text-rose-400 font-bold mt-0.5">
                                        {item.quantity_in_stock} / {item.minimum_quantity} mín
                                    </p>
                                </div>
                                <Link
 href={`/inventory/${item.id}/edit`}
 className="shrink-0 ml-3 text-[13px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 transition-colors"
 >
                                    Ajustar
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Table — Full Ranking */}
            <div className="rounded-2xl bg-card/20 border border-white/[0.04] overflow-hidden">
                {/* Table Header */}
                <div className="p-5 border-b border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <BarChart3 className="w-5 h-5 text-primary/60" />
                        <h3 className="text-sm font-semibold text-foreground">Ranking Completo de Peças</h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {ranking.length} peças
                        </span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 sm:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar peça..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-muted/40 border border-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as typeof sortBy)}
                            className="bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                        >
                            <option value="qty">Mais usadas</option>
                            <option value="revenue">Maior receita</option>
                            <option value="name">Nome A-Z</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.03]">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground w-12">#</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Peça</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Qtd Usada</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Receita</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Em Estoque</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {filteredRanking.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-muted-foreground">
                                        <PackageOpen className="w-8 h-8 mx-auto mb-3" />
                                        <p className="text-sm font-bold">Nenhuma peça encontrada</p>
                                        <p className="text-xs mt-1">Tente ajustar a busca ou o período</p>
                                    </td>
                                </tr>
                            ) : filteredRanking.map((part, i) => {
                                const originalRank = ranking.findIndex(r => r.name === part.name) + 1
                                const isLow = part.inventoryStock !== null && part.minimumStock !== null && part.inventoryStock <= part.minimumStock

                                return (
                                    <tr key={i} className="hover:bg-white/[0.015] transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                'w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-semibold',
                                                originalRank === 1 ? 'bg-amber-500/20 text-amber-400' :
                                                originalRank === 2 ? 'bg-zinc-400/15 text-zinc-300' :
                                                originalRank === 3 ? 'bg-orange-700/20 text-orange-500' :
                                                'text-muted-foreground'
                                            )}>
                                                {originalRank <= 3 ? ['🥇','🥈','🥉'][originalRank - 1] : originalRank}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
                                                    <Wrench className="w-3.5 h-3.5 text-primary/50" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">{part.name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{part.osCount} OS utilizada{part.osCount !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-sm font-semibold text-foreground">{part.totalQty}</span>
                                            <span className="text-[11px] text-muted-foreground ml-1">un</span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-xs font-bold text-emerald-400">{formatCurrency(part.totalRevenue)}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {part.inventoryStock !== null ? (
                                                <span className={cn(
                                                    'text-xs font-semibold',
                                                    isLow ? 'text-rose-400' : 'text-foreground'
                                                )}>
                                                    {part.inventoryStock}
                                                    <span className="text-[11px] text-muted-foreground ml-1">un</span>
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {part.inventoryItemId ? (
                                                isLow ? (
                                                    <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-full">
                                                        Crítico
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                                                        Em Estoque
                                                    </span>
                                                )
                                            ) : (
                                                <Link
 href="/inventory/new"
 className="text-[13px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full hover:bg-amber-500/20 transition-colors"
 >
                                                    + Cadastrar
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredRanking.length > 0 && (
                    <div className="px-6 py-4 border-t border-white/[0.03] flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground font-bold">
                            Mostrando {filteredRanking.length} de {ranking.length} peças · Últimos 30 dias
                        </p>
                        <Link href="/inventory" className="text-[11px] text-primary font-semibold hover:underline">
                            Gerenciar Produtos →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
