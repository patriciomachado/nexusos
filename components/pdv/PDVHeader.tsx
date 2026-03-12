'use client'

import { useState } from 'react'
import { Settings, Grid3X3, Package, BarChart3, ShoppingCart } from 'lucide-react'
import NotificationsDropdown from '../layout/NotificationsDropdown'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePDVStore } from '@/store/usePDVStore'
import { Drawer } from '@/components/ui/Drawer'
import CartSidebar from './CartSidebar'

export default function PDVHeader() {
    const pathname = usePathname()
    const { searchQuery, setSearchQuery, cart } = usePDVStore()
    const [isCartOpen, setIsCartOpen] = useState(false)

    const navItems = [
        { label: 'PDV', path: '/pdv', icon: Grid3X3 },
        { label: 'Estoque', path: '/inventory', icon: Package },
        { label: 'Relatórios', path: '/reports', icon: BarChart3 },
    ]

    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

    return (
        <header className="h-20 border-b border-border bg-background/50 backdrop-blur-3xl flex items-center px-4 lg:px-8 justify-between sticky top-0 z-30">
            {/* Logo */}
            <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-9 h-9 lg:w-10 lg:h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                    <Grid3X3 className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-lg lg:text-xl tracking-tighter leading-none">Nexus <span className="text-primary">OS</span></span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 hidden xs:block">Premium Systems</span>
                </div>
            </div>

            {/* Space for layout balance */}
            <div className="flex-1" />

            {/* Nav & Actions */}
            <div className="flex items-center gap-3 lg:gap-8">
                <nav className="hidden lg:flex items-center gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`text-xs font-black uppercase tracking-widest transition-all hover:text-primary ${pathname === item.path ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2 lg:gap-4">
                    {/* Cart Trigger (Mobile Only) */}
                    <div className="lg:hidden relative">
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 animate-in zoom-in-50 duration-300 active:scale-90 transition-transform"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background animate-in fade-in zoom-in-75 duration-300">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="hidden sm:block">
                        <NotificationsDropdown />
                    </div>
                    <button className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border">
                        <Settings className="w-4 h-4" />
                    </button>
                    <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-primary/10 border border-border flex items-center justify-center overflow-hidden shrink-0">
                        <UserButton />
                    </div>
                </div>
            </div>

            {/* Mobile Cart Drawer */}
            <Drawer 
                isOpen={isCartOpen} 
                onClose={() => setIsCartOpen(false)}
                title="Carrinho de Vendas"
            >
                <div className="h-full">
                    <CartSidebar />
                </div>
            </Drawer>
        </header>
    )
}
