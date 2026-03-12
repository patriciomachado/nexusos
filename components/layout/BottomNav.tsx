'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    ClipboardList,
    ShoppingCart,
    Wallet
} from 'lucide-react'
import { UserRole } from '@/types'

const mobileNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'technician', 'cashier', 'attendant'] },
    { href: '/service-orders', label: 'OS', icon: ClipboardList, roles: ['admin', 'manager', 'technician', 'attendant'] },
    { href: '/pdv', label: 'PDV', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'] },
    { href: '/cash-register', label: 'Caixa', icon: Wallet, roles: ['admin', 'manager', 'cashier'] },
]

export default function BottomNav({ userRole = 'admin' }: { userRole?: UserRole }) {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/80 backdrop-blur-xl border-t border-border px-2 pb-safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16 max-w-md mx-auto">
                {mobileNavItems
                    .filter(item => item.roles.includes(userRole))
                    .map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 relative",
                                    isActive ? "text-primary" : "text-muted-foreground/60"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                )}
                                <Icon className={cn(
                                    "w-5 h-5 transition-transform duration-300",
                                    isActive ? "scale-110" : "hover:scale-110"
                                )} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                            </Link>
                        )
                    })}
            </div>
        </nav>
    )
}
