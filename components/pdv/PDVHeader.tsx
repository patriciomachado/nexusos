'use client'

import { Bell, Search, Settings, Grid3X3, Package, BarChart3 } from 'lucide-react'
import NotificationsDropdown from '../layout/NotificationsDropdown'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePDVStore } from '@/store/usePDVStore'

export default function PDVHeader() {
    const pathname = usePathname()
    const { searchQuery, setSearchQuery } = usePDVStore()

    const navItems = [
        { label: 'PDV', path: '/pdv', icon: Grid3X3 },
        { label: 'Estoque', path: '/inventory', icon: Package },
        { label: 'Relatórios', path: '/reports', icon: BarChart3 },
    ]

    return (
        <header className="h-20 border-b border-border bg-background/50 backdrop-blur-3xl flex items-center px-8 justify-between sticky top-0 z-30">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                    <Grid3X3 className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-xl tracking-tighter leading-none">Nexus <span className="text-primary">OS</span></span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Premium Systems</span>
                </div>
            </div>

            {/* Space for layout balance */}
            <div className="flex-1" />

            {/* Nav & Actions */}
            <div className="flex items-center gap-8">
                <nav className="flex items-center gap-6">
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

                <div className="flex items-center gap-4">
                    <NotificationsDropdown />
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border">
                        <Settings className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-border flex items-center justify-center overflow-hidden">
                        <UserButton />
                    </div>
                </div>
            </div>
        </header>
    )
}
