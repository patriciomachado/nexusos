'use client'

import { ShoppingCart, Wrench, Package, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { InventoryItem } from '@/types'
import { usePDVStore } from '@/store/usePDVStore'

interface ProductCardProps {
    product: InventoryItem
}

export default function ProductCard({ product }: ProductCardProps) {
    const addItem = usePDVStore((state) => state.addItem)

    // Determine if it's a service based on category or name for now
    const isService = product.category?.toLowerCase().includes('serviço') ||
        ['revisão', 'alinhamento', 'balanceamento', 'limpeza', 'formatacao'].some(s => product.name.toLowerCase().includes(s))

    const stockStatus = Number(product.quantity_in_stock) > 0
        ? `Estoque: ${product.quantity_in_stock} ${product.unit}`
        : isService ? 'Serviço Agendado' : 'Sem estoque'

    return (
        <div className="group bg-card border border-border rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            {/* Image Section */}
            <div className="relative h-48 bg-muted overflow-hidden">
                {/* Image Placeholder with Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
                <img
                    src={`https://source.unsplash.com/400x300/?${isService ? 'mechanic,tools' : 'autoparts,engine'}&sig=${product.id}`}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />

                {/* Category Badge */}
                <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1 rounded-full bg-background/50 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-foreground">
                        {product.category || (isService ? 'Serviço' : 'Produto')}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 space-y-4">
                <div>
                    <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${Number(product.quantity_in_stock) <= Number(product.minimum_quantity) && !isService ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {stockStatus}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Preço Venda</span>
                        <span className="text-xl font-black text-foreground tracking-tight">
                            {formatCurrency(Number(product.selling_price))}
                        </span>
                    </div>

                    <button
                        onClick={() => addItem(product)}
                        className={`p-3 rounded-2xl transition-all active:scale-90 ${isService
                                ? 'bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground shadow-lg shadow-secondary/10'
                                : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shadow-lg shadow-primary/10'
                            }`}
                    >
                        {isService ? <Wrench className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
