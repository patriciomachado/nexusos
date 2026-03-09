'use client'

import { useState, useEffect } from 'react'
import { Search, Package, Plus, Loader2 } from 'lucide-react'
import { usePDVStore } from '@/store/usePDVStore'
import { InventoryItem } from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function ProductSearch() {
    const [query, setQuery] = useState('')
    const [products, setProducts] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(false)
    const addItem = usePDVStore((state) => state.addItem)

    useEffect(() => {
        const fetchProducts = async () => {
            if (query.length < 2) {
                setProducts([])
                return
            }
            setLoading(true)
            try {
                const res = await fetch(`/api/inventory?search=${encodeURIComponent(query)}`)
                const data = await res.json()
                setProducts(data.data || [])
            } catch (error) {
                console.error('Error fetching products:', error)
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(fetchProducts, 300)
        return () => clearTimeout(debounce)
    }, [query])

    const handleAdd = (product: InventoryItem) => {
        addItem(product)
        setQuery('')
        setProducts([])
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar produto por nome ou código..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    autoFocus
                />
                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                )}
            </div>

            {products.length > 0 && (
                <div className="absolute z-10 w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                        {products.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => handleAdd(product)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-muted transition-all group"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{product.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                            Stock: {Number(product.quantity_in_stock)} {product.unit} | SKU: {product.sku || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-primary">{formatCurrency(Number(product.selling_price))}</p>
                                    <div className="p-2 rounded-lg bg-foreground text-background opacity-0 group-hover:opacity-100 transition-all">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
