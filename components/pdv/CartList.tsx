'use client'

import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react'
import { usePDVStore } from '@/store/usePDVStore'
import { formatCurrency } from '@/lib/utils'

export default function CartList() {
    const { cart, removeItem, updateQuantity } = usePDVStore()

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 border-2 border-dashed border-border rounded-3xl opacity-60">
                <div className="p-6 rounded-full bg-muted">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-lg">Carrinho Vazio</h3>
                    <p className="text-sm text-muted-foreground">Busque produtos para começar a vender.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {cart.map((item) => (
                <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-card border border-border rounded-2xl gap-4 hover:shadow-lg transition-all animate-in fade-in slide-in-from-right-4 duration-300"
                >
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Plus className="w-6 h-6 rotate-45" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-base truncate pr-2">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">{formatCurrency(item.price)} cada</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-6 sm:gap-8">
                        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                            <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-black text-lg">{item.quantity}</span>
                            <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-2 hover:bg-background rounded-lg transition-colors text-primary"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="text-right min-w-[100px]">
                            <p className="font-black text-lg text-foreground">{formatCurrency(item.total)}</p>
                            <button
                                onClick={() => removeItem(item.id)}
                                className="text-[10px] text-destructive font-black uppercase tracking-widest flex items-center gap-1 ml-auto hover:opacity-70 transition-opacity"
                            >
                                <Trash2 className="w-3 h-3" /> Remover
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
