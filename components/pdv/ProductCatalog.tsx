'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Package, Grid3X3, Wrench, Headphones, Tag } from 'lucide-react'
import { InventoryItem, InventoryUnit } from '@/types'
import { usePDVStore } from '@/store/usePDVStore'
import ProductCard from './ProductCard'

interface Category {
    id: string;
    name: string;
}

export default function ProductCatalog() {
    const [activeCategory, setActiveCategory] = useState('all')
    const searchQuery = usePDVStore((state) => state.searchQuery)
    const [products, setProducts] = useState<InventoryItem[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    
    // Horizontal scroll drag logic
    const categoryRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [scrollLeft, setScrollLeft] = useState(0)

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setStartX(e.pageX - (categoryRef.current?.offsetLeft || 0))
        setScrollLeft(categoryRef.current?.scrollLeft || 0)
    }

    const handleMouseLeave = () => setIsDragging(false)
    const handleMouseUp = () => setIsDragging(false)

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        e.preventDefault()
        const x = e.pageX - (categoryRef.current?.offsetLeft || 0)
        const walk = (x - startX) * 2
        if (categoryRef.current) {
            categoryRef.current.scrollLeft = scrollLeft - walk
        }
    }

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/inventory/categories')
                const data = await res.json()
                if (Array.isArray(data)) {
                    setCategories(data)
                }
            } catch (error) {
                console.error('Error fetching categories:', error)
            }
        }
        fetchCategories()
    }, [])

    useEffect(() => {
        const fetchCatalog = async () => {
            setLoading(true)
            try {
                // Fetch inventory products
                const resInv = await fetch(`/api/inventory?search=${encodeURIComponent(searchQuery)}`)
                const dataInv = await resInv.json()
                const inventoryItems = dataInv.data || []

                let mergedItems = [...inventoryItems]

                // Fetch service types if needed
                if (activeCategory === 'all' || activeCategory === 'servicos' || activeCategory === 'Serviços') {
                    const resSvc = await fetch('/api/settings/service-types')
                    const dataSvc = await resSvc.json()

                    const serviceItems: InventoryItem[] = (Array.isArray(dataSvc) ? dataSvc : []).map(svc => ({
                        id: svc.id,
                        company_id: svc.company_id,
                        name: svc.name,
                        sku: 'SERVICO',
                        description: svc.description || '',
                        category: 'Serviços',
                        category_id: 'servicos',
                        cost_price: 0,
                        selling_price: svc.base_price,
                        quantity_in_stock: 999,
                        minimum_quantity: 0,
                        maximum_quantity: 999,
                        unit: 'un' as InventoryUnit,
                        image_url: '', // Will use fallback
                        serial_number_required: false,
                        is_active: svc.is_active ?? true,
                        created_at: svc.created_at || new Date().toISOString(),
                        updated_at: svc.updated_at || new Date().toISOString()
                    }))

                    const filteredServices = searchQuery
                        ? serviceItems.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        : serviceItems

                    if (activeCategory === 'servicos' || activeCategory === 'Serviços') {
                        mergedItems = [...inventoryItems.filter((p: InventoryItem) => 
                            p.category?.toLowerCase().includes('serviço') || p.category_id === 'servicos'
                        ), ...filteredServices]
                    } else {
                        mergedItems = [...inventoryItems, ...filteredServices]
                    }
                } else if (activeCategory !== 'all') {
                    // Filter by specific category ID or Name
                    mergedItems = inventoryItems.filter((p: InventoryItem) =>
                        p.category_id === activeCategory || p.category === activeCategory
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 shrink-0">
                <div 
                    ref={categoryRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
                >
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeCategory === 'all'
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                    >
                        <Grid3X3 className="w-4 h-4" />
                        Todos
                    </button>
                    <button
                        onClick={() => setActiveCategory('servicos')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeCategory === 'servicos'
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                    >
                        <Wrench className="w-4 h-4" />
                        Serviços
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeCategory === cat.id
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <Tag className="w-4 h-4" />
                            {cat.name}
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
            <div className="flex-1">
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
