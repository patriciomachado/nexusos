'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    ClipboardList,
    Wallet,
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
        <div
            className={cn(
                "fixed inset-0 z-50 lg:hidden transition-all duration-300 pointer-events-none",
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

            {/* Lateral Side Drawer Container (Sliding in from Left to Right) */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 w-[85vw] max-w-xs h-full bg-card/95 dark:bg-background/95 border-r border-border/60 shadow-[10px_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out transform z-10",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Side Drawer Header */}
                <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-background/40">
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
                                Menu Principal
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
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
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

                                <div className="space-y-1.5">
                                    {filteredItems.map((item) => {
                                        const Icon = item.icon
                                        const isActive = pathname === item.href || (pathname ? pathname.startsWith(item.href + '/') : false)

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group active:scale-[0.98]",
                                                    isActive
                                                        ? "bg-primary/10 border-primary/30 text-primary shadow-md shadow-primary/5 font-semibold"
                                                        : "bg-muted/20 hover:bg-muted/50 border-border/30 text-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0",
                                                        isActive
                                                            ? "bg-primary text-white shadow-md shadow-primary/30"
                                                            : "bg-background border border-border/50 text-muted-foreground group-hover:text-primary group-hover:border-primary/30"
                                                    )}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium tracking-tight">
                                                        {item.label}
                                                    </span>
                                                </div>

                                                <ChevronRight className={cn(
                                                    "w-4 h-4 transition-transform duration-300",
                                                    isActive ? "text-primary translate-x-0.5" : "text-muted-foreground/40 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                                                )} />
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Side Drawer Footer */}
                <div className="p-4 border-t border-border/40 shrink-0 bg-background/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl border border-primary/20 p-0.5 bg-primary/5 flex items-center justify-center shrink-0">
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
                            <div className="flex items-center gap-1 mt-0.5">
                                <Shield className="w-3 h-3 text-primary shrink-0" />
                                <span className="text-[9px] font-semibold text-primary uppercase tracking-wider truncate">
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
                </div>
            </div>
        </div>
    )
}
