'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { PanelLeft, PanelLeftClose, MousePointer2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useTaskStore } from '@/store/taskStore'
import { UserRole } from '@/types'
import { visibleGroups, safeRoleOf, isActivePath, ROLE_LABELS } from './nav-config'

const MODES = [
    { id: 'hover', icon: MousePointer2, label: 'Expandir ao passar o mouse' },
    { id: 'open', icon: PanelLeft, label: 'Sempre aberto' },
    { id: 'closed', icon: PanelLeftClose, label: 'Sempre fechado' },
] as const

export default function Sidebar({ userRole = 'attendant', hidden = [] }: { userRole?: UserRole; hidden?: string[] }) {
    const pathname = usePathname()
    const store = useAppStore()
    const [mounted, setMounted] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [company, setCompany] = useState<{ name: string; logo_url: string } | null>(null)
    const taskSummary = useTaskStore(s => s.summary)
    const fetchTaskSummary = useTaskStore(s => s.fetchSummary)

    const role = safeRoleOf(userRole)
    const groups = visibleGroups(role, hidden)
    const showsTasks = groups.some(g => g.items.some(i => i.badge === 'tasks'))

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)

        fetch('/api/auth/me', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.company) setCompany(data.company)
            })
            .catch(console.error)
    }, [])

    useEffect(() => {
        if (!showsTasks) return
        fetchTaskSummary(true)
        const id = setInterval(() => fetchTaskSummary(), 5 * 60_000)
        return () => clearInterval(id)
    }, [showsTasks, fetchTaskSummary, pathname])

    const sidebarOpen = mounted ? store.sidebarOpen : true
    const sidebarMode = mounted ? store.sidebarMode : 'hover'
    const setSidebarMode = store.setSidebarMode

    const expanded = mounted
        ? (sidebarMode === 'open' ? true : sidebarMode === 'closed' ? false : sidebarOpen || isHovered)
        : true

    const badgeCount = taskSummary?.total ?? 0

    return (
        <aside
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Navegação principal"
            className={cn(
                'h-full z-30 flex-col border-r border-border/60 transition-[width] duration-300 ease-out',
                'material-bar',
                expanded ? 'w-64' : 'w-[72px]',
                'hidden lg:flex relative shrink-0'
            )}
        >
            {/* Brand */}
            <div className="h-16 flex items-center gap-3 px-4 shrink-0" suppressHydrationWarning>
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center overflow-hidden shrink-0 p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={company?.logo_url || '/logo.png'}
                        alt={company?.name || 'NexusOS'}
                        className="w-full h-full object-contain"
                    />
                </div>
                {expanded && (
                    <div className="min-w-0 animate-in fade-in duration-200">
                        <p className="text-[15px] font-semibold text-foreground truncate leading-tight">
                            {company?.name || 'NexusOS'}
                        </p>
                        <p className="text-xs text-muted-foreground leading-tight">NexusOS</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 space-y-5">
                {groups.map((group) => (
                    <div key={group.title}>
                        {expanded ? (
                            <h3 className="px-2.5 pb-1 pt-2 text-xs font-semibold text-muted-foreground select-none">
                                {group.title}
                            </h3>
                        ) : (
                            <div className="mx-3 my-2 h-px bg-border/70" aria-hidden />
                        )}
                        <ul className="space-y-0.5">
                            {group.items.map((item) => {
                                const Icon = item.icon
                                const active = isActivePath(pathname, item.href)
                                const count = item.badge === 'tasks' ? badgeCount : 0
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            aria-current={active ? 'page' : undefined}
                                            title={!expanded ? item.label : undefined}
                                            className={cn(
                                                'relative flex items-center gap-3 h-9 rounded-lg transition-colors',
                                                expanded ? 'px-2.5' : 'justify-center px-0',
                                                active
                                                    ? 'bg-primary/12 text-primary font-semibold'
                                                    : 'text-foreground/85 hover:bg-foreground/[0.05]'
                                            )}
                                        >
                                            <Icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2.2 : 1.8} />
                                            {expanded && (
                                                <span className="text-sm truncate flex-1">{item.label}</span>
                                            )}
                                            {count > 0 && (
                                                expanded ? (
                                                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center tabular-nums">
                                                        {count > 99 ? '99+' : count}
                                                    </span>
                                                ) : (
                                                    <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-red-500 ring-2 ring-background" aria-label={`${count} pendências`} />
                                                )
                                            )}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Sidebar behaviour */}
            <div className={cn('px-3 py-2 border-t border-border/60', !expanded && 'px-2')} suppressHydrationWarning>
                <div
                    role="radiogroup"
                    aria-label="Comportamento da barra lateral"
                    className={cn('flex p-0.5 rounded-lg bg-foreground/[0.05]', expanded ? 'flex-row' : 'flex-col')}
                >
                    {MODES.map(mode => {
                        const Icon = mode.icon
                        const selected = sidebarMode === mode.id
                        return (
                            <button
                                key={mode.id}
                                role="radio"
                                aria-checked={selected}
                                aria-label={mode.label}
                                title={mode.label}
                                onClick={() => setSidebarMode(mode.id)}
                                className={cn(
                                    'flex-1 h-7 min-w-7 rounded-md flex items-center justify-center transition-colors',
                                    selected ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Account */}
            <div className="p-3 border-t border-border/60 shrink-0" suppressHydrationWarning>
                {mounted ? (
                    <div className={cn('flex items-center gap-3 rounded-xl', expanded ? 'px-1.5 py-1' : 'justify-center')}>
                        <UserButton
                            userProfileMode="navigation"
                            userProfileUrl="/profile"
                            appearance={{ elements: { avatarBox: 'w-9 h-9' } }}
                        />
                        {expanded && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {ROLE_LABELS[role] ?? role}
                                </p>
                                <Link href="/profile" className="text-xs text-primary hover:underline">
                                    Configurar perfil
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-9 h-9 rounded-full bg-muted animate-pulse mx-auto" />
                )}
            </div>
        </aside>
    )
}
