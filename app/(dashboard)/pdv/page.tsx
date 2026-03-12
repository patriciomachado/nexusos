'use client'

import PDVHeader from '@/components/pdv/PDVHeader'
import ProductCatalog from '@/components/pdv/ProductCatalog'
import CartSidebar from '@/components/pdv/CartSidebar'
import PDVFooter from '@/components/pdv/PDVFooter'

export default function PDVPage() {
    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--primary), 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--primary), 0.2);
                }
            `}</style>

            {/* Premium Header */}
            <PDVHeader />

            {/* Main PDV Area */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left: Product Catalog Grid */}
                <div className="flex-1 p-4 lg:p-8 overflow-hidden">
                    <ProductCatalog />
                </div>

                {/* Right: Cart Sidebar (Fixed Width on Desktop, Hidden on Mobile) */}
                <aside className="hidden lg:block w-[32%] min-w-[400px] h-full border-l border-border/50">
                    <CartSidebar />
                </aside>
            </main>

            {/* Bottom Status Bar */}
            <PDVFooter />
        </div>
    )
}

