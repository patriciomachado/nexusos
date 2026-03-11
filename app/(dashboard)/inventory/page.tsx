import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import {
    Search,
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
    if (!userId) redirect('/sign-in')

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
            <Header title="Estoque e Produtos" />

            <div className="p-8 lg:p-12 max-w-screen-2xl mx-auto space-y-10">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-1 bg-primary rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Controle de Ativos</span>
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter">Estoque Central</h2>
                        <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-xl">Gerencie seu inventário de peças e insumos com precisão cirúrgica.</p>
                    </div>
                    <Link
                        href="/inventory/new"
                        className="flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-[0.1em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 group"
                    >
                        Novo Produto
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    </Link>
                </div>

                {/* KPI Section - Premium Style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative group overflow-hidden p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-3xl border border-white/5 shadow-2xl transition-all hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Package className="w-20 h-20 text-primary" />
                        </div>
                        <div className="relative space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Package className="w-6 h-6 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Total de SKUs</p>
                                <h3 className="text-4xl font-black text-foreground tracking-tighter">{items?.length || 0}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                <TrendingUp className="w-4 h-4" />
                                <span>Itens Ativos</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative group overflow-hidden p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-3xl border border-white/5 shadow-2xl transition-all hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Boxes className="w-20 h-20 text-indigo-400" />
                        </div>
                        <div className="relative space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Boxes className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Patrimônio em Estoque</p>
                                <h3 className="text-4xl font-black text-foreground tracking-tighter">{formatCurrency(totalValue)}</h3>
                            </div>
                            <p className="text-muted-foreground/40 text-[10px] font-bold uppercase tracking-widest">Baseado no preço de custo</p>
                        </div>
                    </div>

                    <div className={cn(
                        "relative group overflow-hidden p-8 rounded-[2.5rem] backdrop-blur-3xl border shadow-2xl transition-all hover:scale-[1.02]",
                        lowStockItems.length > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-card/40 border-white/5"
                    )}>
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertTriangle className={cn("w-20 h-20", lowStockItems.length > 0 ? "text-rose-500" : "text-muted-foreground/20")} />
                        </div>
                        <div className="relative space-y-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                lowStockItems.length > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-muted/10 border-white/5"
                            )}>
                                <AlertTriangle className={cn("w-6 h-6", lowStockItems.length > 0 ? "text-rose-500" : "text-muted-foreground/20")} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Fluxo de Reposição</p>
                                <h3 className={cn("text-4xl font-black tracking-tighter", lowStockItems.length > 0 ? "text-rose-500" : "text-foreground")}>{lowStockItems.length}</h3>
                            </div>
                            <p className={cn("text-[10px] font-bold uppercase tracking-widest", lowStockItems.length > 0 ? "text-rose-400" : "text-muted-foreground/40")}>
                                {lowStockItems.length > 0 ? "Ação necessária urgente" : "Estoque saudável"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search and Action Bar */}
                <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                    <div className="relative flex-1 w-full md:max-w-md group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                        <SearchInput
                            placeholder="Pesquisar por nome ou SKU..."
                            className="w-full bg-muted/30 border border-white/5 rounded-[1.5rem] pl-12 pr-6 py-4 text-sm font-medium focus:outline-none focus:border-primary/30 transition-all placeholder:opacity-30 h-14"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <CategoryManagerWrapper />
                        <button className="h-14 flex items-center gap-3 px-8 rounded-[1.5rem] bg-muted/30 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-all">
                            <Filter className="w-5 h-5" />
                            <span>Filtros Avançados</span>
                        </button>
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-muted/20 border-b border-white/5">
                                    <th className="text-left p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Produto / SKU</th>
                                    <th className="text-left p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Categoria</th>
                                    <th className="text-right p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Preço de Venda</th>
                                    <th className="text-right p-6 text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Estoque Atual</th>
                                    <th className="p-6 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Status</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {items && items.length > 0 ? items.map((item) => {
                                    const isLow = item.quantity_in_stock <= item.minimum_quantity

                                    return (
                                        <tr key={item.id} className="group hover:bg-white/5 transition-all">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-white/5 overflow-hidden flex-shrink-0 relative group-hover:border-primary/20 transition-all shadow-inner">
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
                                                        {item.sku && <p className="text-[10px] text-muted-foreground/30 font-mono uppercase tracking-widest">{item.sku}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="px-3 py-1.5 rounded-xl bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
                                                    {item.category || 'Geral'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-black text-foreground tracking-tighter">{formatCurrency(item.selling_price)}</span>
                                                    <span className="text-[10px] text-muted-foreground/30 font-bold">Custo: {formatCurrency(item.cost_price)}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "text-lg font-black tracking-tighter",
                                                        isLow ? 'text-rose-500' : 'text-foreground/80'
                                                    )}>
                                                        {item.quantity_in_stock} <span className="text-xs uppercase opacity-40 ml-1">{UNIT_LABELS[item.unit] || item.unit}</span>
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-widest">Ativo</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex justify-center">
                                                    {isLow ? (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                            Reposição
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            Saudável
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/inventory/${item.id}/edit`}
                                                        className="p-3 rounded-xl bg-muted/40 hover:bg-primary hover:text-primary-foreground transition-all group/edit relative"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-popover text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/edit:opacity-100 transition-all pointer-events-none border border-border">Editar</span>
                                                    </Link>
                                                    <InventoryActions itemId={item.id} companyId={user?.company_id} />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="p-32 text-center">
                                            <div className="w-24 h-24 rounded-[2rem] bg-muted/20 border border-white/5 flex items-center justify-center mx-auto mb-6">
                                                <Package className="w-10 h-10 text-muted-foreground/20" />
                                            </div>
                                            <h3 className="text-2xl font-black tracking-tight text-foreground/60">Estoque Vazio</h3>
                                            <p className="text-muted-foreground/40 text-sm mt-2 mb-10 max-w-xs mx-auto">Sua vitrine de peças e insumos aparecerá aqui após o cadastro.</p>
                                            <Link
                                                href="/inventory/new"
                                                className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-105"
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

