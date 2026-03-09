import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Plus, AlertTriangle, Package, Search, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal, Boxes } from 'lucide-react'
import InventoryActions from '@/components/inventory/InventoryActions'
import SearchInput from '@/components/ui/SearchInput'

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
        <div className="animate-fade-in pb-10 bg-background min-h-screen transition-colors duration-300">
            <Header title="Gestão de Produtos" />

            <div className="p-4 max-w-7xl mx-auto space-y-4">

                {/* Insights Row - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="p-4 rounded-xl bg-card border border-border backdrop-blur-xl shadow-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">Total de Itens</span>
                        </div>
                        <p className="text-xl font-black text-foreground tracking-tight">{items?.length || 0}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border backdrop-blur-xl shadow-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Boxes className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">Valor em Estoque</span>
                        </div>
                        <p className="text-xl font-black text-foreground tracking-tight">{formatCurrency(totalValue)}</p>
                    </div>

                    <div className={`p-4 rounded-xl border backdrop-blur-xl transition-all shadow-lg ${lowStockItems.length > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-card border-border'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-destructive' : 'text-muted-foreground/20'}`} />
                            <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">Reposição Crítica</span>
                        </div>
                        <p className={`text-xl font-black tracking-tight ${lowStockItems.length > 0 ? 'text-destructive' : 'text-foreground'}`}>{lowStockItems.length}</p>
                    </div>
                </div>

                {/* Search and Action Bar - Compact */}
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="w-full md:w-80">
                        <SearchInput
                            placeholder="Buscar produto ou SKU..."
                            className="w-full bg-muted/60 border border-border rounded-xl py-2.5 pl-11 pr-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all backdrop-blur-md"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest hover:bg-muted hover:text-foreground transition-all">
                            <Filter className="w-3.5 h-3.5" />
                            <span>Filtros</span>
                        </button>
                        <Link
                            href="/inventory/new"
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Produto
                        </Link>
                    </div>
                </div>

                {/* Inventory List - Dense */}
                <div className="rounded-[2rem] border border-border bg-card/40 backdrop-blur-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="text-left p-4 text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Produto / SKU</th>
                                    <th className="text-left p-4 text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Categoria</th>
                                    <th className="text-right p-4 text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Preços (Custo/Venda)</th>
                                    <th className="text-right p-4 text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Estoque</th>
                                    <th className="p-4 text-center text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">Status</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {items && items.length > 0 ? items.map((item) => {
                                    const isLow = item.quantity_in_stock <= item.minimum_quantity

                                    return (
                                        <tr key={item.id} className="group hover:bg-muted/30 transition-all">
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.name}</p>
                                                    {item.sku && <p className="text-[9px] text-muted-foreground/20 font-mono mt-0.5 tracking-widest uppercase">{item.sku}</p>}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground/50 text-[9px] font-black uppercase tracking-widest border border-border">
                                                    {item.category || 'Geral'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-black text-foreground tracking-tighter">{formatCurrency(item.selling_price)}</span>
                                                    <span className="text-[9px] text-muted-foreground/20">Custo: {formatCurrency(item.cost_price)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-xs font-black ${isLow ? 'text-destructive' : 'text-foreground/80'}`}>
                                                        {item.quantity_in_stock} {UNIT_LABELS[item.unit] || item.unit}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground/20">Mín: {item.minimum_quantity} {item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center">
                                                    {isLow ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                            Reposição
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            OK
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <InventoryActions itemId={item.id} companyId={user?.company_id} />
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center border border-border">
                                                    <Package className="w-6 h-6 text-muted-foreground/10" />
                                                </div>
                                                <div className="max-w-xs space-y-1">
                                                    <p className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">Nenhum produto cadastrado</p>
                                                    <p className="text-muted-foreground/20 text-[10px] italic">Sua vitrine de peças e insumos aparecerá aqui.</p>
                                                </div>
                                            </div>
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
