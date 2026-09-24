import {
    LayoutDashboard, ClipboardList, Calendar, Users,
    Package, BarChart3, Settings, Zap,
    Wallet, HeartHandshake, Users2, Wrench, Smartphone, ListChecks, Sparkles,
} from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavItem {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    roles: string[]
    /** Tile color for the iOS Settings–style mobile list. */
    tint: string
    /** Shows the pending-tasks badge. */
    badge?: 'tasks'
}

export interface NavGroup {
    title: string
    items: NavItem[]
}

export const navGroups: NavGroup[] = [
    {
        title: 'Operação',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'technician', 'cashier', 'talento'], tint: 'bg-indigo-500' },
            { href: '/tarefas', label: 'Tarefas', icon: ListChecks, roles: ['admin', 'owner'], tint: 'bg-red-500', badge: 'tasks' },
            { href: '/appointments', label: 'Mesa / Fluxo', icon: Calendar, roles: ['admin', 'manager'], tint: 'bg-orange-500' },
            { href: '/service-orders', label: 'Ordens de Serviço', icon: ClipboardList, roles: ['admin', 'manager', 'technician', 'attendant', 'talento'], tint: 'bg-blue-500' },
            { href: '/pdv', label: 'Vendas / PDV', icon: Zap, roles: ['admin', 'manager', 'cashier', 'attendant', 'talento'], tint: 'bg-green-500' },
            { href: '/devices', label: 'Venda de Aparelhos', icon: Smartphone, roles: ['admin', 'manager', 'cashier', 'attendant', 'talento'], tint: 'bg-cyan-500' },
        ]
    },
    {
        title: 'Clientes e estoque',
        items: [
            { href: '/customers', label: 'Clientes', icon: Users, roles: ['admin', 'manager', 'technician', 'cashier', 'talento'], tint: 'bg-blue-500' },
            { href: '/pecas', label: 'Peças', icon: Wrench, roles: ['admin', 'manager'], tint: 'bg-teal-500' },
            { href: '/inventory', label: 'Produtos', icon: Package, roles: ['admin', 'manager'], tint: 'bg-orange-500' },
            { href: '/post-sales', label: 'Pós-Venda', icon: HeartHandshake, roles: ['admin', 'manager'], tint: 'bg-pink-500' },
        ]
    },
    {
        title: 'Administrativo',
        items: [
            { href: '/alice', label: 'Alice (IA)', icon: Sparkles, roles: ['admin', 'owner'], tint: 'bg-violet-500' },
            { href: '/cash-register', label: 'Caixa', icon: Wallet, roles: ['admin', 'manager', 'cashier'], tint: 'bg-green-500' },
            { href: '/team', label: 'Equipe', icon: Users2, roles: ['admin', 'manager'], tint: 'bg-purple-500' },
            { href: '/reports', label: 'Relatórios', icon: BarChart3, roles: ['admin', 'manager'], tint: 'bg-indigo-500' },
            { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin'], tint: 'bg-zinc-500' },
        ]
    }
]

const VALID_ROLES = ['admin', 'owner', 'manager', 'technician', 'cashier', 'attendant', 'talento']

export function safeRoleOf(userRole?: UserRole | string): string {
    return userRole && VALID_ROLES.includes(userRole) ? userRole : 'attendant'
}

export function visibleGroups(role: string): NavGroup[] {
    return navGroups
        .map(group => ({
            ...group,
            items: group.items.filter(item => {
                // Attendants only see OS and PDV. No exceptions.
                if (role === 'attendant') return ['/service-orders', '/pdv'].includes(item.href)
                return item.roles.includes(role)
            }),
        }))
        .filter(group => group.items.length > 0)
}

export function isActivePath(pathname: string | null, href: string) {
    return pathname === href || (pathname ? pathname.startsWith(href + '/') : false)
}

export const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    owner: 'Proprietário',
    manager: 'Gerente',
    technician: 'Técnico',
    cashier: 'Caixa',
    attendant: 'Atendente',
    talento: 'Talento',
}
