'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Package, Grid3X3, Wrench, Headphones } from 'lucide-react'
import { InventoryItem, InventoryUnit } from '@/types'
import { usePDVStore } from '@/store/usePDVStore'
import ProductCard from './ProductCard'

const CATEGORIES = [
    { id: 'all', label: 'Todos', icon: Grid3X3 },
    { id: 'peças', label: 'Peças', icon: Package },
    { id: 'serviços', label: 'Serviços', icon: Wrench },
    { id: 'acessórios', label: 'Acessórios', icon: Headphones },
]

export default function ProductCatalog() {
    const [activeCategory, setActiveCategory] = useState('all')
    const searchQuery = usePDVStore((state) => state.searchQuery)
    const [products, setProducts] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCatalog = async () => {
            setLoading(true)
            try {
                // Fetch inventory products
                const resInv = await fetch(`/api/inventory?search=${encodeURIComponent(searchQuery)}`)
                const dataInv = await resInv.json()
                const inventoryItems = dataInv.data || []

                // Fetch service types if category is 'all' or 'serviços'
                let mergedItems = [...inventoryItems]

                if (activeCategory === 'all' || activeCategory === 'serviços') {
                    const resSvc = await fetch('/api/settings/service-types')
                    const dataSvc = await resSvc.json()

                    const serviceItems: InventoryItem[] = (Array.isArray(dataSvc) ? dataSvc : []).map(svc => ({
                        id: svc.id,
                        company_id: svc.company_id,
                        name: svc.name,
                        sku: 'SERVICO',
                        description: svc.description || '',
                        category: 'Serviços',
                        cost_price: 0,
                        selling_price: svc.base_price,
                        quantity_in_stock: 999,
                        minimum_quantity: 0,
                        maximum_quantity: 999,
                        unit: 'un' as InventoryUnit,
                        image_url: '',
                        serial_number_required: false,
                        is_active: svc.is_active ?? true,
                        created_at: svc.created_at || new Date().toISOString(),
                        updated_at: svc.updated_at || new Date().toISOString()
                    }))

                    // Search filtering for services (since API doesn't filter them yet)
                    const filteredServices = searchQuery
                        ? serviceItems.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        : serviceItems

                    if (activeCategory === 'serviços') {
                        mergedItems = [...inventoryItems.filter((p: InventoryItem) => p.category?.toLowerCase() === 'serviços'), ...filteredServices]
                    } else {
                        mergedItems = [...inventoryItems, ...filteredServices]
                    }
                } else {
                    // Filter standard inventory by other categories
                    mergedItems = inventoryItems.filter((p: InventoryItem) =>
                        p.category?.toLowerCase() === activeCategory.toLowerCase()
                    )
                }

                setProducts(mergedItems)
            } catch (error) {
                console.error('Error fetching catalog:', error)
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(fetchCatalog, 300)
        return () => clearTimeout(debounce)
    }, [searchQuery, activeCategory])

    return (
        <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700">
            {/* Catalog Header: Categories & Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === cat.id
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 text-muted-foreground whitespace-nowrap">
                    <Package className="w-5 h-5 opacity-40" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                        {loading ? 'Carregando...' : `${products.length} itens no catálogo`}
                    </span>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizando Catálogo...</p>
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-24 text-center space-y-6 border-2 border-dashed border-border rounded-[40px] opacity-40">
                        <div className="p-8 rounded-full bg-muted">
                            <Search className="w-16 h-16 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-black text-2xl tracking-tighter uppercase">Nenhum item encontrado</h3>
                            <p className="text-sm font-bold opacity-60">Tente ajustar sua busca ou categoria.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
