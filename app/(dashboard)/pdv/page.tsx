'use client'

import Header from '@/components/layout/Header'
import ProductCatalog from '@/components/pdv/ProductCatalog'
import CartSidebar from '@/components/pdv/CartSidebar'
import PDVFooter from '@/components/pdv/PDVFooter'
import FinishSaleModal from '@/components/pdv/FinishSaleModal'
import { usePDVStore } from '@/store/usePDVStore'
import { InventoryItem } from '@/types'
import { Search, ShoppingCart, Grid3X3, Package, BarChart3, Loader2, Plus, X, QrCode } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal'
import { toast } from 'sonner'

export default function PDVPage() {
    const pathname = usePathname()
    const { isFinishModalOpen, setIsFinishModalOpen, subtotal, discount, total, searchQuery, setSearchQuery, cart, addItem } = usePDVStore()
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [mobileResults, setMobileResults] = useState<InventoryItem[]>([])
    const [mobileLoading, setMobileLoading] = useState(false)

    // Handle barcode scan in PDV
    const handleBarcodeScan = async (code: string) => {
        try {
            const res = await fetch(`/api/inventory?search=${encodeURIComponent(code)}`)
            const data = await res.json()
            const items: InventoryItem[] = data.data || []

            // Find exact match by barcode or sku
            const exactMatch = items.find(i => 
                (i.barcode && i.barcode.toLowerCase() === code.toLowerCase()) || 
                (i.sku && i.sku.toLowerCase() === code.toLowerCase())
            ) || (items.length === 1 ? items[0] : null)

            if (exactMatch) {
                addItem(exactMatch)
                toast.success(`Adicionado: ${exactMatch.name}`)
                setSearchQuery('')
            } else {
                setSearchQuery(code)
                setIsSearchOpen(true)
                toast.info(`Buscando por: ${code}`)
            }
        } catch (error) {
            console.error('Error fetching scanned barcode:', error)
            setSearchQuery(code)
        }
    }

    // Fetch search results for mobile
    useEffect(() => {
        const fetchMobileResults = async () => {
            if (!isSearchOpen || searchQuery.length < 1) {
                setMobileResults([])
                return
            }
            setMobileLoading(true)
            try {
                const res = await fetch(`/api/inventory?search=${encodeURIComponent(searchQuery)}`)
                const data = await res.json()
                setMobileResults(data.data || [])
            } catch (error) {
                console.error('Error fetching mobile results:', error)
            } finally {
                setMobileLoading(false)
            }
        }

        const debounce = setTimeout(fetchMobileResults, 300)
        return () => clearTimeout(debounce)
    }, [searchQuery, isSearchOpen])

    const handleAddMobileItem = (product: InventoryItem) => {
        addItem(product)
        setSearchQuery('')
        setMobileResults([])
        setIsSearchOpen(false)
    }

    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

    const navItems = [
        { label: 'PDV', path: '/pdv', icon: Grid3X3 },
        { label: 'Estoque', path: '/inventory', icon: Package },
        { label: 'Relatórios', path: '/reports', icon: BarChart3 },
    ]

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

            {/* Standard Header with PDV Actions */}
            <Header title="Ponto de Venda" subtitle="Frente de Caixa">
                <div className="flex items-center gap-2 lg:gap-4 w-full">
                    {/* Desktop Search */}
                    <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md group">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Pesquisar produtos... (F2)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-muted/20 border border-border/40 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="p-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary transition-all flex items-center justify-center shrink-0 active:scale-95"
                            title="Escanear Código de Barras"
                        >
                            <QrCode className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden xl:flex items-center gap-4 border-l border-border/40 pl-4">
                        {navItems.map((item) => (
                            <Link
 key={item.path}
 href={item.path}
 className={`text-[13px] font-black transition-all hover:text-primary ${pathname === item.path ? 'text-primary' : 'text-muted-foreground'
 }`}
 >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Mobile Controls */}
                    <div className="flex lg:hidden items-center gap-2 ml-auto">
                        <button 
                            onClick={() => setIsScannerOpen(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 active:scale-95"
                            title="Escanear Código"
                        >
                            <QrCode className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsSearchOpen(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted/40 text-muted-foreground border border-border/40"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20 relative"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-background">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </Header>

            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleBarcodeScan}
                title="Escanear Código para Venda"
            />

            {/* Mobile Drawers */}
            <Drawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} title="Carrinho">
                <CartSidebar />
            </Drawer>
            <Drawer isOpen={isSearchOpen} onClose={() => { setIsSearchOpen(false); setSearchQuery(''); }} title="Pesquisar">
                <div className="p-4 space-y-4">
                    <input
                        type="text"
                        placeholder="Nome do produto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full bg-muted/50 border border-border/50 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    
                    {/* Mobile Search Results */}
                    {mobileLoading && (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}
                    
                    {!mobileLoading && mobileResults.length > 0 && (
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {mobileResults.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => handleAddMobileItem(product)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted transition-all"
                                >
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-foreground">{product.name}</p>
                                        <p className="text-[11px] text-muted-foreground">Stock: {Number(product.quantity_in_stock)} {product.unit}</p>
                                    </div>
                                    <p className="font-black text-primary">{formatCurrency(Number(product.selling_price))}</p>
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {!mobileLoading && searchQuery && mobileResults.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
                        </div>
                    )}
                </div>
            </Drawer>

            {/* Main PDV Area */}
            <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* Left: Product Catalog Grid */}
                <div className="flex-1 flex flex-col p-4 lg:p-8 min-h-0 overflow-y-auto custom-scrollbar">
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

