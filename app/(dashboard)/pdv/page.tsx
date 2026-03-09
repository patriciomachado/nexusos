'use client'

import { ShoppingCart, PackageSearch } from 'lucide-react'
import Header from '@/components/layout/Header'
import ProductSearch from '@/components/pdv/ProductSearch'
import CartList from '@/components/pdv/CartList'
import CheckoutSummary from '@/components/pdv/CheckoutSummary'

export default function PDVPage() {
    return (
        <div className="flex flex-col min-h-screen pb-12">
            <Header title="PDV - Ponto de Venda" />

            <div className="flex-1 p-4 lg:p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Left Column: Product Search & Cart */}
                    <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 ml-2">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <PackageSearch className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight uppercase">Produtos</h2>
                            </div>
                            <ProductSearch />
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 ml-2">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight uppercase">Carrinho de Compras</h2>
                            </div>
                            <CartList />
                        </section>
                    </div>

                    {/* Right Column: Checkout Summary */}
                    <div className="lg:sticky lg:top-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <CheckoutSummary />
                    </div>

                </div>
            </div>
        </div>
    )
}
