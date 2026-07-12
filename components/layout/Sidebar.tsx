'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard, ClipboardList, Calendar, Users, Wrench,
    Package, BarChart3, Settings, Zap,
    Wallet, PanelLeft, PanelLeftClose, MousePointer2
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { UserRole } from '@/types'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'technician', 'cashier', 'talento'] },
    { href: '/service-orders', label: 'Ordens de Serviço', icon: ClipboardList, roles: ['admin', 'manager', 'technician', 'attendant', 'talento'] },
    { href: '/appointments', label: 'Agendamentos', icon: Calendar, roles: ['admin', 'manager'] },
    { href: '/customers', label: 'Clientes', icon: Users, roles: ['admin', 'manager', 'technician', 'cashier', 'talento'] },
    { href: '/technicians', label: 'Técnicos', icon: Wrench, roles: ['admin', 'manager'] },
    { href: '/inventory', label: 'Produtos', icon: Package, roles: ['admin', 'manager'] },
    { href: '/pdv', label: 'PDV', icon: Zap, roles: ['admin', 'manager', 'cashier', 'attendant', 'talento'] },
    { href: '/team', label: 'Equipe', icon: Users, roles: ['admin', 'manager'] },
    { href: '/cash-register', label: 'Caixa', icon: Wallet, roles: ['admin', 'manager', 'cashier'] }, // Cashier can see cash register too
    { href: '/reports', label: 'Relatórios', icon: BarChart3, roles: ['admin', 'manager'] },
    { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin'] },
]

export default function Sidebar({ userRole = 'attendant' }: { userRole?: UserRole }) {
    const pathname = usePathname()
    const store = useAppStore()
    const [mounted, setMounted] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [company, setCompany] = useState<{ name: string; logo_url: string } | null>(null)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
        
        fetch('/api/auth/me', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.company) {
                    setCompany(data.company)
                }
            })
            .catch(console.error)
    }, [])

    // Prevent hydration mismatch
    const validRoles = ['admin', 'owner', 'manager', 'technician', 'cashier', 'attendant', 'talento']
    const safeRole = (userRole && validRoles.includes(userRole)) ? userRole : 'attendant'
    
    const sidebarOpen = mounted ? store.sidebarOpen : true
    const sidebarMode = mounted ? store.sidebarMode : 'hover'
    const setSidebarMode = store.setSidebarMode

    const effectiveOpen = mounted ? 
        (sidebarMode === 'open' ? true : 
         sidebarMode === 'closed' ? false : 
         sidebarOpen || isHovered) 
        : true

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
                <div className="h-16 lg:h-20 flex items-center px-3 lg:px-4 border-b border-border shrink-0 relative overflow-hidden bg-background/30" suppressHydrationWarning>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" suppressHydrationWarning />
                    <div className={cn(
                        "rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-primary/20 relative z-10 transition-all duration-500 overflow-hidden bg-white dark:bg-white/95 border border-primary/10",
                        effectiveOpen ? "w-14 h-14 lg:w-16 lg:h-16 p-2" : "w-10 h-10 p-1"
                    )} suppressHydrationWarning>
                        {company?.logo_url ? (
                            <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain hover:scale-110 transition-transform duration-500" />
                        ) : (
                            <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-contain hover:scale-110 transition-transform duration-500" />
                        )}
                    </div>
                    {effectiveOpen && (
                        <div className="ml-4 flex flex-col relative z-10 animate-in fade-in slide-in-from-left-4 duration-500">
                            <span className="font-black text-foreground dark:text-white tracking-[0.05em] text-sm lg:text-base leading-none opacity-90">
                                {company?.name || 'NEXUS'}<span className="text-primary">OS</span>
                            </span>
                            <span className="text-[7px] font-bold text-primary uppercase tracking-[0.2em] mt-1 opacity-60">Premium Systems</span>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                    {navItems
                        .filter(item => {
                            // FORCED SECURITY: Attendants ONLY see OS and PDV. No exceptions.
                            if (safeRole === 'attendant') {
                                return ['/service-orders', '/pdv'].includes(item.href);
                            }
                            // Other roles follow their defined permissions
                            return item.roles.includes(safeRole);
                        })
                        .map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href || (pathname ? pathname.startsWith(item.href + '/') : false)
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

                {/* Sidebar Mode Toggle */}
                <div className={cn(
                    "px-2 py-2 border-t border-border",
                    !effectiveOpen && "flex flex-col items-center gap-1"
                )} suppressHydrationWarning>
                    <div className={cn(
                        "flex items-center justify-center gap-1",
                        !effectiveOpen && "flex-col"
                    )} suppressHydrationWarning>
                        <button
                            onClick={() => setSidebarMode('hover')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                sidebarMode === 'hover' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                                !effectiveOpen && "p-1.5"
                            )}
                            title="Hover"
                        >
                            <MousePointer2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setSidebarMode('open')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                sidebarMode === 'open' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                                !effectiveOpen && "p-1.5"
                            )}
                            title="Sempre aberto"
                        >
                            <PanelLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setSidebarMode('closed')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                sidebarMode === 'closed' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                                !effectiveOpen && "p-1.5"
                            )}
                            title="Sempre fechado"
                        >
                            <PanelLeftClose className="w-4 h-4" />
                        </button>
                    </div>
                </div>

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
                                    <p className="text-sm font-bold text-foreground truncate drop-shadow-md capitalize">
                                        {safeRole === 'admin' ? 'Administrador' :
                                         safeRole === 'owner' ? 'Proprietário' :
                                         safeRole === 'manager' ? 'Gerente' :
                                         safeRole === 'technician' ? 'Técnico' :
                                         safeRole === 'cashier' ? 'Caixa' :
                                         safeRole === 'attendant' ? 'Atendente' :
                                         safeRole === 'talento' ? 'Talento' : safeRole}
                                    </p>
                                    <Link href="/profile" className="text-xs text-primary truncate hover:underline block mt-1">Configurar Perfil</Link>
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
