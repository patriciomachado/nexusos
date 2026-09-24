'use client'

import { Menu } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import ThemeToggle from './ThemeToggle'
import NotificationsDropdown from './NotificationsDropdown'
import { UserButton } from '@clerk/nextjs'
import { useState, useEffect } from 'react'

interface HeaderProps {
    title: string
    subtitle?: string
    children?: React.ReactNode
}

export default function Header({ title, subtitle, children }: HeaderProps) {
    const { mobileMenuOpen, setMobileMenuOpen } = useAppStore()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    return (
        <header
            className="h-14 lg:h-16 px-2 sm:px-4 lg:px-8 flex items-center justify-between gap-2 sticky top-0 z-40 material-bar border-b border-border/60"
            suppressHydrationWarning
        >
            {/* Leading: menu + title */}
            <div className="flex items-center gap-1 lg:gap-3 min-w-0 shrink" suppressHydrationWarning>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="lg:hidden w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-primary hover:bg-foreground/[0.05] active:bg-foreground/[0.08] transition-colors"
                    aria-label="Abrir menu"
                    aria-expanded={mobileMenuOpen}
                >
                    <Menu className="w-[22px] h-[22px]" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-[17px] font-semibold tracking-tight text-foreground truncate leading-tight">{title}</h1>
                    {subtitle && (
                        <p className="hidden sm:block text-xs text-muted-foreground truncate leading-tight">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Center: search or page controls. Never narrower than its
                content, so page buttons can't slide under the bell; the
                title truncates instead. */}
            <div className="flex-1 max-w-xl mx-1 sm:mx-4 min-w-fit">
                {children}
            </div>

            {/* Trailing: actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0" suppressHydrationWarning>
                <NotificationsDropdown />
                {/* On phones the appearance switch lives in the menu drawer. */}
                <div className="hidden sm:block">
                    <ThemeToggle />
                </div>
                <div className="hidden sm:flex w-11 h-11 items-center justify-center" suppressHydrationWarning>
                    {mounted && (
                        <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
                    )}
                </div>
            </div>
        </header>
    )
}
