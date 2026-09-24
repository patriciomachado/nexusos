'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X, ChevronRight } from 'lucide-react'
import { UserRole } from '@/types'
import { useAppStore } from '@/store/appStore'
import { useTaskStore } from '@/store/taskStore'
import { UserButton, useUser } from '@clerk/nextjs'
import { visibleGroups, safeRoleOf, isActivePath, ROLE_LABELS } from './nav-config'

/**
 * Mobile navigation drawer. Rows follow the iOS grouped-list pattern
 * (lists-and-tables.md): 44pt rows, colored symbol tiles, chevrons.
 */
export default function BottomNav({ userRole = 'attendant' }: { userRole?: UserRole }) {
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)
    const { mobileMenuOpen, setMobileMenuOpen } = useAppStore()
    const { user: clerkUser } = useUser()
    const [company, setCompany] = useState<{ name: string; logo_url: string } | null>(null)
    const taskSummary = useTaskStore(s => s.summary)

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

    // Close the menu on route change
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname, setMobileMenuOpen])

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileMenuOpen) setMobileMenuOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [mobileMenuOpen, setMobileMenuOpen])

    if (!mounted) return null

    const role = safeRoleOf(userRole)
    const groups = visibleGroups(role)

    return (
        <div
            className={cn(
                'fixed inset-0 z-50 lg:hidden pointer-events-none',
                mobileMenuOpen && 'pointer-events-auto'
            )}
            aria-hidden={!mobileMenuOpen}
        >
            {/* Dimming layer */}
            <div
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                    'fixed inset-0 bg-black/35 transition-opacity duration-300',
                    mobileMenuOpen ? 'opacity-100' : 'opacity-0'
                )}
            />

            <nav
                aria-label="Menu principal"
                className={cn(
                    'fixed inset-y-0 left-0 w-[86vw] max-w-sm h-full bg-background flex flex-col overflow-hidden shadow-2xl',
                    'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* Title bar */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5 flex items-center justify-center shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={company?.logo_url || '/logo.png'} alt={company?.name || 'NexusOS'} className="w-full h-full object-contain" />
                        </div>
                        <p className="type-title3 text-foreground truncate">{company?.name || 'NexusOS'}</p>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center"
                        aria-label="Fechar menu"
                    >
                        <span className="w-8 h-8 rounded-full bg-foreground/[0.07] flex items-center justify-center text-muted-foreground">
                            <X className="w-4 h-4" strokeWidth={2.5} />
                        </span>
                    </button>
                </div>

                {/* Grouped list */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
                    {groups.map((group) => (
                        <section key={group.title}>
                            <h3 className="px-4 pb-1.5 text-[13px] text-muted-foreground">{group.title}</h3>
                            <ul className="bg-card rounded-xl overflow-hidden">
                                {group.items.map((item, idx) => {
                                    const Icon = item.icon
                                    const active = isActivePath(pathname, item.href)
                                    const count = item.badge === 'tasks' ? taskSummary?.total ?? 0 : 0
                                    return (
                                        <li key={item.href} className="relative">
                                            {idx > 0 && <div className="absolute left-[52px] right-0 top-0 h-px bg-border/70" aria-hidden />}
                                            <Link
                                                href={item.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                aria-current={active ? 'page' : undefined}
                                                className={cn(
                                                    'flex items-center gap-3 pl-3 pr-3 min-h-11 active:bg-foreground/[0.06] transition-colors',
                                                    active && 'bg-primary/8'
                                                )}
                                            >
                                                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0', item.tint)}>
                                                    <Icon className="w-4 h-4" strokeWidth={2.2} />
                                                </span>
                                                <span className={cn(
                                                    'flex-1 py-2.5 text-[17px] truncate',
                                                    active ? 'font-semibold text-primary' : 'text-foreground'
                                                )}>
                                                    {item.label}
                                                </span>
                                                {count > 0 && (
                                                    <span className="min-w-6 h-6 px-2 rounded-full bg-red-500 text-white text-[13px] font-semibold flex items-center justify-center tabular-nums">
                                                        {count > 99 ? '99+' : count}
                                                    </span>
                                                )}
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    ))}
                </div>

                {/* Account */}
                <div className="px-4 py-3 border-t border-border/70 shrink-0 flex items-center gap-3">
                    <UserButton appearance={{ elements: { avatarBox: 'w-9 h-9' } }} />
                    <div className="min-w-0">
                        <p className="text-[15px] font-medium text-foreground truncate">
                            {clerkUser?.fullName || 'Minha conta'}
                        </p>
                        <p className="text-[13px] text-muted-foreground truncate">{ROLE_LABELS[role] ?? role}</p>
                    </div>
                </div>
            </nav>
        </div>
    )
}
