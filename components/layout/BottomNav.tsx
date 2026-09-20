'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    ClipboardList,
    ShoppingCart,
    Wallet,
    Menu,
    X,
    Sparkles,
    Calendar,
    Zap,
    Smartphone,
    Users,
    Wrench,
    Package,
    HeartHandshake,
    Users2,
    BarChart3,
    Settings,
    ChevronRight,
    Shield
} from 'lucide-react'
import { UserRole } from '@/types'
import { useAppStore } from '@/store/appStore'
import { UserButton, useUser } from '@clerk/nextjs'

interface NavItem {
    href: string
    label: string
    icon: React.ComponentType<any>
    roles: string[]
}

interface NavGroup {
    title: string
    items: NavItem[]
}

const navGroups: NavGroup[] = [
    {
        title: 'Gestão Operacional',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'technician', 'cashier', 'talento'] },
            { href: '/studio', label: 'Nexus Studio', icon: Sparkles, roles: ['admin', 'manager', 'technician', 'attendant', 'talento'] },
            { href: '/appointments', label: 'Mesa / Fluxo', icon: Calendar, roles: ['admin', 'manager'] },
            { href: '/service-orders', label: 'Ordens de Serviço', icon: ClipboardList, roles: ['admin', 'manager', 'technician', 'attendant', 'talento'] },
            { href: '/pdv', label: 'Vendas / PDV', icon: Zap, roles: ['admin', 'manager', 'cashier', 'attendant', 'talento'] },
            { href: '/devices', label: 'Venda de Aparelhos', icon: Smartphone, roles: ['admin', 'manager', 'cashier', 'attendant', 'talento'] },
        ]
    },
    {
        title: 'Clientes',
        items: [
            { href: '/customers', label: 'Clientes', icon: Users, roles: ['admin', 'manager', 'technician', 'cashier', 'talento'] },
            { href: '/pecas', label: 'Peças', icon: Wrench, roles: ['admin', 'manager'] },
            { href: '/inventory', label: 'Produtos', icon: Package, roles: ['admin', 'manager'] },
            { href: '/post-sales', label: 'Pós-Venda', icon: HeartHandshake, roles: ['admin', 'manager'] },
        ]
    },
    {
        title: 'Administrativo',
        items: [
            { href: '/cash-register', label: 'Caixa', icon: Wallet, roles: ['admin', 'manager', 'cashier'] },
            { href: '/team', label: 'Equipe', icon: Users2, roles: ['admin', 'manager'] },
            { href: '/reports', label: 'Relatórios', icon: BarChart3, roles: ['admin', 'manager'] },
            { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin'] },
        ]
    }
]

const mobileQuickNavItems = [
    { href: '/dashboard', label: 'Início', icon: LayoutDashboard, roles: ['admin', 'manager', 'technician', 'cashier', 'talento'] },
    { href: '/service-orders', label: 'OS', icon: ClipboardList, roles: ['admin', 'manager', 'technician', 'attendant', 'talento'] },
    { href: '/pdv', label: 'PDV', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier', 'attendant', 'talento'] },
    { href: '/cash-register', label: 'Caixa', icon: Wallet, roles: ['admin', 'manager', 'cashier'] },
]

export default function BottomNav({ userRole = 'attendant' }: { userRole?: UserRole }) {
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)
    const { mobileMenuOpen, setMobileMenuOpen } = useAppStore()
    const { user: clerkUser } = useUser()
    const [company, setCompany] = useState<{ name: string; logo_url: string } | null>(null)

    useEffect(() => {
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

    // Automatically close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname, setMobileMenuOpen])

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileMenuOpen) {
                setMobileMenuOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [mobileMenuOpen, setMobileMenuOpen])

    if (!mounted) return null

    const validRoles = ['admin', 'owner', 'manager', 'technician', 'cashier', 'attendant', 'talento']
    const safeRole = (userRole && validRoles.includes(userRole)) ? userRole : 'attendant'

    return (
        <>
            {/* Quick Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/85 backdrop-blur-2xl border-t border-border/60 px-2 pb-safe-area-inset-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-all duration-300">
                <div className="flex items-center justify-around h-16 max-w-md mx-auto">
                    {mobileQuickNavItems
                        .filter(item => {
                            if (safeRole === 'attendant') {
                                return ['/service-orders', '/pdv'].includes(item.href)
                            }
                            return item.roles.includes(safeRole)
                        })
                        .map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href || (pathname ? pathname.startsWith(item.href + '/') : false)

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 relative",
                                        isActive ? "text-primary font-bold" : "text-muted-foreground/70 hover:text-foreground"
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-in fade-in duration-300" />
                                    )}
                                    <Icon className={cn(
                                        "w-5 h-5 transition-transform duration-300",
                                        isActive ? "scale-110" : "hover:scale-110"
                                    )} />
                                    <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                                </Link>
                            )
                        })}

                    {/* Mobile Menu Toggle Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 relative",
                            mobileMenuOpen ? "text-primary font-bold" : "text-muted-foreground/70 hover:text-foreground"
                        )}
                        aria-label="Menu Completo"
                    >
                        {mobileMenuOpen && (
                            <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-in fade-in duration-300" />
                        )}
                        <Menu className={cn(
                            "w-5 h-5 transition-transform duration-300",
                            mobileMenuOpen ? "rotate-90 scale-110 text-primary" : ""
                        )} />
                        <span className="text-[10px] uppercase tracking-wider">Menu</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Floating Overlay Sheet Drawer */}
            <div
                className={cn(
                    "fixed inset-0 z-50 lg:hidden transition-all duration-300 flex flex-col justify-end pointer-events-none",
                    mobileMenuOpen ? "pointer-events-auto" : ""
                )}
            >
                {/* Backdrop Overlay */}
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                        "fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 ease-in-out",
                        mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                />

                {/* Floating Sheet Container */}
                <div
                    className={cn(
                        "relative w-full max-h-[88vh] bg-card/95 dark:bg-background/95 border-t border-border/60 rounded-t-[2.5rem] shadow-[0_-12px_48px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out transform z-10",
                        mobileMenuOpen ? "translate-y-0" : "translate-y-full"
                    )}
                >
                    {/* Top Drag Indicator */}
                    <div className="w-full pt-3 pb-1 flex justify-center shrink-0">
                        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
                    </div>

                    {/* Header */}
                    <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between shrink-0 bg-background/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/95 p-1.5 border border-primary/20 shadow-md flex items-center justify-center">
                                {company?.logo_url ? (
                                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
                                ) : (
                                    <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-contain" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-foreground text-sm tracking-wide leading-none">
                                    {company?.name || 'NEXUS'}<span className="text-primary">OS</span>
                                </span>
                                <span className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1 opacity-80">
                                    Navegação Completa
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
                            aria-label="Fechar Menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Menu Navigation Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {navGroups.map((group) => {
                            const filteredItems = group.items.filter(item => {
                                if (safeRole === 'attendant') {
                                    return ['/service-orders', '/pdv'].includes(item.href)
                                }
                                return item.roles.includes(safeRole)
                            })

                            if (filteredItems.length === 0) return null

                            return (
                                <div key={group.title} className="space-y-2">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <h3 className="text-xs font-black tracking-wider text-muted-foreground/70 uppercase">
                                            {group.title}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {filteredItems.map((item) => {
                                            const Icon = item.icon
                                            const isActive = pathname === item.href || (pathname ? pathname.startsWith(item.href + '/') : false)

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 group active:scale-[0.98]",
                                                        isActive
                                                            ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5 font-semibold"
                                                            : "bg-muted/30 hover:bg-muted/60 border-border/40 text-foreground"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                                                            isActive
                                                                ? "bg-primary text-white shadow-md shadow-primary/30"
                                                                : "bg-background border border-border/60 text-muted-foreground group-hover:text-primary group-hover:border-primary/30"
                                                        )}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm font-medium tracking-tight">
                                                            {item.label}
                                                        </span>
                                                    </div>

                                                    <ChevronRight className={cn(
                                                        "w-4 h-4 transition-transform duration-300",
                                                        isActive ? "text-primary translate-x-1" : "text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-muted-foreground"
                                                    )} />
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Drawer Footer User Profile */}
                    <div className="p-4 border-t border-border/40 shrink-0 bg-background/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl border border-primary/20 p-0.5 bg-primary/5 flex items-center justify-center">
                                <UserButton
                                    appearance={{
                                        elements: {
                                            avatarBox: 'w-full h-full rounded-lg'
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">
                                    {clerkUser?.fullName || 'Operador Nexus'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Shield className="w-3 h-3 text-primary" />
                                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                                        {safeRole === 'admin' ? 'Administrador' :
                                         safeRole === 'owner' ? 'Proprietário' :
                                         safeRole === 'manager' ? 'Gerente' :
                                         safeRole === 'technician' ? 'Técnico' :
                                         safeRole === 'cashier' ? 'Caixa' :
                                         safeRole === 'attendant' ? 'Atendente' :
                                         safeRole === 'talento' ? 'Talento' : safeRole}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-xl border border-primary/20 transition-all active:scale-95"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
