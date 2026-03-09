'use client'

import { useState } from 'react'
import { Receipt, ArrowRight, Tag, Wallet } from 'lucide-react'
import { usePDVStore } from '@/store/usePDVStore'
import { formatCurrency } from '@/lib/utils'
import FinishSaleModal from './FinishSaleModal'

export default function CheckoutSummary() {
    const { cart, total } = usePDVStore()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [discount, setDiscount] = useState(0)

    const finalAmount = Math.max(0, total - discount)

    if (cart.length === 0) return null

    return (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
                <Receipt className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Resumo da Venda</h3>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">{formatCurrency(total)}</span>
                </div>

                <div className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Desconto</span>
                    </div>
                    <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] pl-2 font-black text-destructive">R$</span>
                        <input
                            type="number"
                            value={discount || ''}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            className="w-24 pl-7 pr-2 py-1.5 rounded-xl bg-muted border-none text-right font-black text-destructive text-sm outline-none focus:ring-2 focus:ring-destructive/20 transition-all"
                            placeholder="0,00"
                        />
                    </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Final</p>
                        <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(finalAmount)}</p>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 bg-foreground text-background px-8 py-5 rounded-3xl font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-foreground/20"
                    >
                        Pagar <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <FinishSaleModal
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                total={total}
                discount={discount}
                finalAmount={finalAmount}
            />
        </div>
    )
}
