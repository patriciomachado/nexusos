import PageHeader, { primaryActionClass } from '@/components/ui/PageHeader'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import {
    Plus,
    Filter,
    Download,
    Package,
    AlertCircle,
    AlertTriangle,
    Boxes,
    TrendingUp,
    ArrowRight,
    MoreVertical,
    Edit
} from 'lucide-react'
import InventoryActions from '@/components/inventory/InventoryActions'
import SearchInput from '@/components/ui/SearchInput'
import CategoryManagerWrapper from '@/components/inventory/CategoryManagerWrapper'

const UNIT_LABELS: Record<string, string> = {
    un: 'un', kg: 'kg', m: 'm', l: 'L', cx: 'cx', pc: 'pc', par: 'par'
}

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string }>
}) {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('role').eq('clerk_id', userId).single()
    if (currentUser?.role === 'technician' || currentUser?.role === 'cashier' || currentUser?.role === 'attendant') {
        redirect('/dashboard')
    }

    const { search } = await searchParams
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    let query = db
        .from('inventory_items')
        .select('*')
        .eq('company_id', user?.company_id)
        .eq('is_active', true)

    if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    const { data: items } = await query.order('name')

    const lowStockItems = items?.filter(i => i.quantity_in_stock <= i.minimum_quantity) || []
    const totalValue = items?.reduce((acc, current) => acc + (current.cost_price * current.quantity_in_stock), 0) || 0

    return (
        <div className="animate-fade-in pb-12 bg-background min-h-screen transition-colors duration-300">
            <Header title="Estoque e Produtos" subtitle="Gerencie seu inventário de peças e insumos com precisão." />

            <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 space-y-6 max-w-screen-2xl mx-auto">

                <PageHeader
                    actions={<>
<Link
 href="/inventory/new"
 className={primaryActionClass}
 >
                        Novo Produto
                        <Plus className="w-4 h-4" />
                    </Link>
                    </>}
                />

                {/* KPI Section - Premium Style */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="relative group overflow-hidden p-5 sm:p-8 rounded-2xl sm:rounded-3xl glass-premium bg-card/65 border border-border/40 transition duration-300">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Package className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
                        </div>
                        <div className="relative space-y-3 sm:space-y-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs sm:text-[11px] font-semibold text-muted-foreground">Total de SKUs</p>
                                <h3 className="text-2xl sm:text-4xl font-black text-foreground tracking-tighter">{items?.length || 0}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                <TrendingUp className="w-4 h-4" />
                                <span>Itens Ativos</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative group overflow-hidden p-5 sm:p-8 rounded-2xl sm:rounded-3xl glass-premium bg-card/65 border border-border/40 transition duration-300">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Boxes className="w-16 h-16 sm:w-20 sm:h-20 text-indigo-400" />
                        </div>
                        <div className="relative space-y-3 sm:space-y-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Boxes className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs sm:text-[11px] font-semibold text-muted-foreground">Patrimônio em Estoque</p>
                                <h3 className="text-2xl sm:text-4xl font-black text-foreground tracking-tighter">{formatCurrency(totalValue)}</h3>
                            </div>
                            <p className="text-muted-foreground text-xs font-bold">Preço de Custo</p>
                        </div>
                    </div>

                    <div className={cn(
                        "relative group overflow-hidden p-5 sm:p-8 rounded-2xl sm:rounded-3xl border transition duration-300",
                        lowStockItems.length > 0 ? "bg-rose-500/10 border-rose-500/20" : "glass-premium bg-card/65 border-border/40"
                    )}>
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertTriangle className={cn("w-16 h-16 sm:w-20 sm:h-20", lowStockItems.length > 0 ? "text-rose-500" : "text-muted-foreground")} />
                        </div>
                        <div className="relative space-y-3 sm:space-y-4">
                            <div className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border",
                                lowStockItems.length > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-muted/10 border-border/60"
                            )}>
                                <AlertTriangle className={cn("w-5 h-5 sm:w-6 sm:h-6", lowStockItems.length > 0 ? "text-rose-500" : "text-muted-foreground")} />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs sm:text-[11px] font-semibold text-muted-foreground">Reposição Urgente</p>
                                <h3 className={cn("text-2xl sm:text-4xl font-black tracking-tighter", lowStockItems.length > 0 ? "text-rose-500" : "text-foreground")}>{lowStockItems.length}</h3>
                            </div>
                            <p className={cn("text-xs font-bold", lowStockItems.length > 0 ? "text-rose-400" : "text-muted-foreground")}>
                                {lowStockItems.length > 0 ? "Ação necessária" : "Estoque saudável"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search and Action Bar */}
                <div className="bg-card/60 border border-border/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative flex-1 w-full md:max-w-md group">
                        <SearchInput
                            placeholder="Pesquisar nome, SKU ou código..."
                            className="w-full bg-muted/30 border border-border/40 rounded-xl sm:rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm font-medium focus:outline-none focus:border-primary/30 transition placeholder:opacity-40 h-11 sm:h-14"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between sm:justify-end">
                        <CategoryManagerWrapper />
                        <button className="h-11 sm:h-14 flex items-center gap-2 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-muted/30 border border-border/40 text-[13px] sm:text-[11px] font-semibold text-muted-foreground hover:text-foreground transition">
                            <Filter className="w-4 h-4" />
                            <span>Filtros</span>
                        </button>
                    </div>
                </div>

                {/* Mobile View: Compact Cards List (block md:hidden) */}
                <div className="block md:hidden space-y-3">
                    {items && items.length > 0 ? items.map((item) => {
                        const isLow = item.quantity_in_stock <= item.minimum_quantity

                        return (
                            <div key={item.id} className="p-4 rounded-2xl bg-card/75 border border-border/40 shadow-md space-y-3 overflow-hidden">
                                <div className="flex items-start justify-between gap-3 min-w-0">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-muted/40 border border-border/40 overflow-hidden shrink-0 flex items-center justify-center">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-5 h-5 opacity-30 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <h4 className="text-sm font-semibold text-foreground line-clamp-2 break-words leading-tight">{item.name}</h4>
                                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                                {item.sku && <span className="font-mono text-muted-foreground truncate max-w-[120px]">{item.sku}</span>}
                                                {item.barcode && <span className="font-mono text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded truncate max-w-[140px]">EAN: {item.barcode}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/inventory/${item.id}/edit`}
                                        className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 flex items-center justify-center active:scale-95"
                                        title="Editar Produto"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                                    <div>
                                        <span className="text-xs font-bold text-muted-foreground block">Preço</span>
                                        <span className="font-semibold text-foreground text-sm">{formatCurrency(item.selling_price)}</span>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-xs font-bold text-muted-foreground block">Estoque</span>
                                        <span className={cn("font-semibold text-sm", isLow ? 'text-rose-500' : 'text-foreground/90')}>
                                            {item.quantity_in_stock} <span className="text-xs opacity-60">{UNIT_LABELS[item.unit] || item.unit}</span>
                                        </span>
                                    </div>

                                    <div>
                                        {isLow ? (
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                Reposição
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                OK
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="p-10 text-center bg-card/40 border border-border/40 rounded-2xl">
                            <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                            <h3 className="text-base font-bold text-foreground">Nenhum produto cadastrado</h3>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">Adicione itens ao estoque.</p>
                            <Link
 href="/inventory/new"
 className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs"
 >
                                <Plus className="w-4 h-4" />
                                Cadastrar
                            </Link>
                        </div>
                    )}
                </div>

                {/* Desktop View: Full Table (hidden md:block) */}
                <div className="hidden md:block bg-card/40 border border-border/40 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-muted/20 border-b border-border/40">
                                    <th className="text-left p-6 text-xs font-semibold text-muted-foreground">Produto / SKU</th>
                                    <th className="text-left p-6 text-xs font-semibold text-muted-foreground">Categoria</th>
                                    <th className="text-right p-6 text-xs font-semibold text-muted-foreground">Preço de Venda</th>
                                    <th className="text-right p-6 text-xs font-semibold text-muted-foreground">Estoque Actual</th>
                                    <th className="p-6 text-center text-xs font-semibold text-muted-foreground">Status</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {items && items.length > 0 ? items.map((item) => {
                                    const isLow = item.quantity_in_stock <= item.minimum_quantity

                                    return (
                                        <tr key={item.id} className="group hover:bg-muted/20 transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/40 overflow-hidden flex-shrink-0 relative group-hover:scale-105 transition duration-300 shadow-inner">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center opacity-20">
                                                                <Package className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col space-y-1">
                                                        <p className="text-base font-black text-foreground group-hover:text-primary transition-colors tracking-tight">{item.name}</p>
                                                        <div className="flex items-center gap-3">
                                                            {item.sku && <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>}
                                                            {item.barcode && <span className="text-[11px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md font-mono">EAN: {item.barcode}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="px-3 py-1.5 rounded-xl bg-primary/5 text-primary text-xs font-semibold border border-primary/10">
                                                    {item.category || 'Geral'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-black text-foreground tracking-tighter">{formatCurrency(item.selling_price)}</span>
                                                    <span className="text-[11px] text-muted-foreground font-bold">Custo: {formatCurrency(item.cost_price)}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "text-lg font-black tracking-tighter",
                                                        isLow ? 'text-rose-500' : 'text-foreground/80'
                                                    )}>
                                                        {item.quantity_in_stock} <span className="text-xs opacity-40 ml-1">{UNIT_LABELS[item.unit] || item.unit}</span>
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-bold">Ativo</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex justify-center">
                                                    {isLow ? (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                            Reposição
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            Saudável
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/inventory/${item.id}/edit`}
                                                        className="p-3 rounded-xl bg-muted/40 hover:bg-primary hover:text-primary-foreground transition group/edit relative"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-popover text-xs font-semibold rounded-lg opacity-0 group-hover/edit:opacity-100 transition pointer-events-none border border-border">Editar</span>
                                                    </Link>
                                                    <InventoryActions itemId={item.id} companyId={user?.company_id} />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="p-32 text-center">
                                            <div className="w-24 h-24 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-center mx-auto mb-6">
                                                <Package className="w-10 h-10 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-2xl font-black tracking-tight text-foreground/60">Estoque Vazio</h3>
                                            <p className="text-muted-foreground text-sm mt-2 mb-10 max-w-xs mx-auto">Sua vitrine de peças e insumos aparecerá aqui após o cadastro.</p>
                                            <Link
 href="/inventory/new"
 className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-semibold text-xs transition"
 >
                                                <Plus className="w-5 h-5" />
                                                Cadastrar Produto
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

