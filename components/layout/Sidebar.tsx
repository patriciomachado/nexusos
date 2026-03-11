'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard, ClipboardList, Calendar, Users, Wrench,
    Package, CreditCard, BarChart3, Settings, Zap, Menu, X,
    Bell, Wallet
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { UserRole } from '@/types'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'technician', 'cashier', 'attendant'] },
    { href: '/service-orders', label: 'Ordens de Serviço', icon: ClipboardList, roles: ['admin', 'manager', 'technician', 'attendant'] },
    { href: '/appointments', label: 'Agendamentos', icon: Calendar, roles: ['admin', 'manager'] },
    { href: '/customers', label: 'Clientes', icon: Users, roles: ['admin', 'manager', 'technician', 'cashier', 'attendant'] },
    { href: '/technicians', label: 'Técnicos', icon: Wrench, roles: ['admin', 'manager'] },
    { href: '/inventory', label: 'Produtos', icon: Package, roles: ['admin', 'manager'] },
    { href: '/pdv', label: 'PDV', icon: Zap, roles: ['admin', 'manager', 'cashier', 'attendant'] },
    { href: '/team', label: 'Equipe', icon: Users, roles: ['admin', 'manager'] },
    { href: '/cash-register', label: 'Caixa', icon: Wallet, roles: ['admin', 'manager'] },
    { href: '/reports', label: 'Relatórios', icon: BarChart3, roles: ['admin', 'manager'] },
    { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin'] },
]

export default function Sidebar({ userRole = 'admin' }: { userRole?: UserRole }) {
    const pathname = usePathname()
    const store = useAppStore()
    const [mounted, setMounted] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Prevent hydration mismatch
    const sidebarOpen = mounted ? store.sidebarOpen : true
    const setSidebarOpen = store.setSidebarOpen
    const effectiveOpen = sidebarOpen || isHovered

    return (
        <>
            {/* Sidebar */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    'fixed left-0 top-0 h-screen z-30 flex flex-col bg-card border-r border-border shadow-[4px_0_24px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.6)] transition-all duration-300',
                    effectiveOpen ? 'w-60' : 'w-16',
                    'hidden lg:flex relative'
                )}
            >
                {/* Logo */}
                <div className="h-14 lg:h-18 flex items-center px-3 lg:px-4 border-b border-border shrink-0 relative overflow-hidden bg-background/30" suppressHydrationWarning>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" suppressHydrationWarning />
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 relative z-10 transition-transform hover:rotate-6" suppressHydrationWarning>
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    {effectiveOpen && (
                        <div className="ml-4 flex flex-col relative z-10 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="font-black text-foreground tracking-widest text-lg leading-none">NEXUS<span className="text-primary">OS</span></span>
                            <span className="text-[8px] font-black text-primary/50 uppercase tracking-[0.2em] mt-1">Premium Systems</span>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                    {navItems
                        .filter(item => item.roles.includes(userRole))
                        .map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden',
                                        isActive
                                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                                    )}
                                    title={!effectiveOpen ? item.label : undefined}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                    )}
                                    <Icon className={cn("w-5 h-5 shrink-0 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-primary")} />
                                    {effectiveOpen && (
                                        <span className="text-sm font-medium tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                </nav>

                {/* Bottom user area */}
                <div className="p-3 border-t border-border shrink-0 bg-gradient-to-b from-transparent to-foreground/5 dark:to-black/20" suppressHydrationWarning>
                    {mounted ? (
                        <div className="flex items-center gap-4 p-2 rounded-xl hover:bg-muted transition-colors animate-in fade-in duration-500">
                            <div className="relative">
                                <UserButton
                                    userProfileMode="navigation"
                                    userProfileUrl="/profile"
                                    appearance={{
                                        elements: {
                                            avatarBox: 'w-10 h-10 rounded-xl border border-border shadow-lg',
                                        }
                                    }}
                                />
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full" />
                            </div>
                            {effectiveOpen && (
                                <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <p className="text-sm font-medium text-foreground truncate drop-shadow-md">Logado</p>
                                    <Link href="/profile" className="text-xs text-primary truncate hover:underline block">Configurar Perfil</Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-muted animate-pulse mx-auto" />
                    )}
                </div>
            </aside>
        </>
    )
}
