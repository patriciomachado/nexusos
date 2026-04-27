'use client'

import PDVHeader from '@/components/pdv/PDVHeader'
import ProductCatalog from '@/components/pdv/ProductCatalog'
import CartSidebar from '@/components/pdv/CartSidebar'
import PDVFooter from '@/components/pdv/PDVFooter'
import FinishSaleModal from '@/components/pdv/FinishSaleModal'
import { usePDVStore } from '@/store/usePDVStore'

export default function PDVPage() {
    const { isFinishModalOpen, setIsFinishModalOpen, subtotal, discount, total } = usePDVStore()

    return (
        <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-background text-foreground overflow-hidden">
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--primary) / 0.3);
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--primary) / 0.5);
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Premium Header */}
            <PDVHeader />

            {/* Main PDV Area */}
            <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* Left: Product Catalog Grid */}
                <div className="flex-1 flex flex-col p-4 lg:p-8 min-h-0">
                    <ProductCatalog />
                </div>

                {/* Right: Cart Sidebar (Fixed Width on Desktop, Hidden on Mobile) */}
                <aside className="hidden lg:block w-[32%] min-w-[400px] border-l border-border/50 shrink-0">
                    <CartSidebar />
                </aside>
            </main>

            {/* Bottom Status Bar */}
            <PDVFooter />

            <FinishSaleModal
                isOpen={isFinishModalOpen}
                setIsOpen={setIsFinishModalOpen}
                total={subtotal}
                discount={discount}
                finalAmount={total}
            />
        </div>
    )
}

