'use client'

import { Trash2, Plus, Minus, CreditCard, Banknote, QrCode, ShoppingCart, ShoppingBag } from 'lucide-react'
import { usePDVStore } from '@/store/usePDVStore'
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'

export default function CartSidebar() {
    const { cart, subtotal, taxAmount, discount, total, removeItem, updateQuantity, clearCart, setDiscount, setIsFinishModalOpen } = usePDVStore()
    const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro')

    if (cart.length === 0) {
        return (
            <div className="flex flex-col h-full bg-card/30 backdrop-blur-3xl p-6 lg:p-8 animate-in fade-in duration-700">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="font-black text-2xl tracking-tighter uppercase underline decoration-primary decoration-4 underline-offset-8">Carrinho</h2>
                    <ShoppingBag className="w-8 h-8 text-muted-foreground opacity-20" />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                    <div className="p-10 rounded-[40px] bg-muted shadow-inner">
                        <ShoppingCart className="w-20 h-20 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-black text-xl tracking-tight uppercase">Carrinho Vazio</h3>
                        <p className="text-sm font-bold opacity-60">Selecione produtos no catálogo<br />para começar.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-card/30 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden relative">
            {/* Cart Header */}
            <div className="p-4 lg:p-8 pb-2 lg:pb-4 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <h2 className="font-black text-xl lg:text-2xl tracking-tighter uppercase whitespace-nowrap">Carrinho</h2>
                    <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Consumidor Final</span>
                </div>
                <button
                    onClick={clearCart}
                    className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-95"
                >
                    <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
            </div>

            {/* Scrollable Cart List */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 pt-2 lg:pt-4 space-y-3 lg:space-y-4 custom-scrollbar">
                {cart.map((item) => (
                    <div key={item.id} className="group bg-background/50 border border-border/50 rounded-3xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all hover:bg-card">
                        <div className="w-20 h-20 rounded-2xl bg-muted overflow-hidden flex-shrink-0 border border-border/30">
                            <img
                                src={`https://source.unsplash.com/100x100/?autopart&sig=${item.id}`}
                                alt={item.product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="font-bold text-sm text-foreground truncate">{item.product.name}</h4>
                            <span className="text-primary font-black text-xs mt-1">{formatCurrency(item.price)}</span>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-xl border border-border/30">
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="p-1 hover:bg-background rounded-lg text-muted-foreground transition-colors"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="p-1 hover:bg-background rounded-lg text-primary transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                            <button
                                onClick={() => removeItem(item.id)}
                                className="text-[9px] font-black uppercase text-destructive/60 hover:text-destructive transition-colors tracking-widest"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Checkout Area */}
            <div className="p-4 lg:p-8 bg-muted/30 border-t border-border/50 space-y-4 lg:space-y-6 shrink-0 relative z-10">
                {/* Detailed Summary */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                        <span className="font-black text-foreground">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-muted-foreground uppercase tracking-widest">Impostos (estimado)</span>
                        <span className="font-black text-foreground">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs group">
                        <span className="font-bold text-destructive/60 uppercase tracking-widest group-hover:text-destructive transition-colors">Descontos</span>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-destructive">- {formatCurrency(discount)}</span>
                        </div>
                    </div>
                    <div className="pt-2 lg:pt-4 border-t border-border flex justify-between items-baseline">
                        <span className="font-black text-base lg:text-lg tracking-tighter uppercase">Total</span>
                        <span className="text-3xl lg:text-4xl font-black text-primary tracking-tighter drop-shadow-sm">{formatCurrency(total)}</span>
                    </div>
                </div>

                {/* Quick Payment Buttons */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                        { id: 'cartao', label: 'Cartão', icon: CreditCard },
                        { id: 'pix', label: 'Pix', icon: QrCode },
                    ].map((method) => (method && (
                        <button
                            key={method.id}
                            //@ts-ignore
                            onClick={() => setPaymentMethod(method.id)}
                            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-3xl border-2 transition-all active:scale-95 ${paymentMethod === method.id
                                    ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10 scale-105'
                                    : 'bg-background border-border/50 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                                }`}
                        >
                            <method.icon className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{method.label}</span>
                        </button>
                    )))}
                </div>

                {/* Final Button */}
                <button
                    onClick={() => setIsFinishModalOpen(true)}
                    className="w-full bg-primary text-primary-foreground py-4 lg:py-6 rounded-2xl lg:rounded-3xl font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] text-xs lg:text-sm shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:translate-y-0 active:scale-98 flex items-center justify-center gap-3 lg:gap-4"
                >
                    <ShoppingCart className="w-5 h-5" />
                    Finalizar Venda
                </button>
            </div>

            {/* Modal state is now handled in PDV/page.tsx */}
        </div>
    )
}
