'use client'

import { ShoppingCart, Wrench, Package, AlertCircle, Plus } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { InventoryItem, InventoryUnit } from '@/types'
import { usePDVStore } from '@/store/usePDVStore'

interface ProductCardProps {
    product: InventoryItem
}

export default function ProductCard({ product }: ProductCardProps) {
    const addItem = usePDVStore((state) => state.addItem)

    // Determine if it's a service based on category, name, or SKU
    const isService = product.category?.toLowerCase().includes('serviço') ||
        product.sku === 'SERVICO' ||
        ['revisão', 'alinhamento', 'balanceamento', 'limpeza', 'formatacao'].some(s => product.name.toLowerCase().includes(s))

    const stockStatus = isService
        ? 'Serviço sob Demanda'
        : Number(product.quantity_in_stock) > 0
            ? `Estoque: ${product.quantity_in_stock} ${product.unit}`
            : 'Sem estoque'

    const price = Number(product.selling_price || 0)

    return (
        <div className="group glass-premium bg-card/65 border border-border/60 rounded-2xl overflow-hidden hover:shadow-2xl active:scale-[0.97] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
            {/* Image Section */}
            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-48 bg-foreground/[0.03] overflow-hidden">
                {/* Image Placeholder with Gradient */}
                <div className="absolute inset-0 z-10" />
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                        {isService ? <Wrench className="w-20 h-20" /> : <Package className="w-20 h-20" />}
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-2 left-2 lg:top-4 lg:left-4 z-20 max-w-[calc(100%-1rem)]">
                    <span className={cn(
                        "block truncate px-2 lg:px-3 py-0.5 lg:py-1 rounded-full border border-border/60 text-[11px] lg:text-xs font-semibold backdrop-blur-sm",
                        isService ? "bg-orange-500/20 text-orange-500" : "bg-background/50 text-foreground"
                    )}>
                        {product.category || (isService ? 'Serviço' : 'Produto')}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-3 lg:p-5 space-y-2 lg:space-y-4">
                <div>
                    <h3 className="font-semibold lg:font-bold text-[14px] lg:text-base leading-snug text-foreground line-clamp-2 lg:line-clamp-1 min-h-[2.5em] lg:min-h-0 group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                            "text-[12px] lg:text-xs font-medium lg:font-bold",
                            !isService && Number(product.quantity_in_stock) <= Number(product.minimum_quantity) ? 'text-destructive' : 'text-muted-foreground'
                        )}>
                            {stockStatus}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 lg:pt-2">
                    <div className="flex flex-col min-w-0">
                        <span className="hidden lg:block text-xs font-semibold text-muted-foreground leading-none mb-1">Valor Final</span>
                        <span className="text-[17px] lg:text-xl font-bold lg:font-black text-foreground tracking-tight truncate">
                            {formatCurrency(price)}
                        </span>
                    </div>

                    <button
                        onClick={() => addItem(product)}
                        className={cn(
                            "p-2.5 lg:p-3 rounded-xl lg:rounded-2xl shrink-0 transition-all active:scale-95 flex items-center gap-2 group/btn",
                            isService
                                ? "bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white"
                                : "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white"
                        )}
                        title="Adicionar ao Carrinho"
                    >
                        <div className="relative">
                            {isService ? <Wrench className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                            <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full p-0.5 shadow-sm group-hover/btn:scale-110 transition-transform">
                                <Plus className={cn(
                                    "w-2.5 h-2.5",
                                    isService ? "text-orange-600" : "text-indigo-600"
                                )} />
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}
