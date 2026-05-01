'use client'

import { Search, Command } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import ThemeToggle from './ThemeToggle'
import NotificationsDropdown from './NotificationsDropdown'
import { UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface HeaderProps {
    title: string
    subtitle?: string
    children?: React.ReactNode
}

export default function Header({ title, subtitle, children }: HeaderProps) {
    const { user: appUser } = useAppStore()
    const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <header className="h-14 lg:h-16 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40 bg-background/40 backdrop-blur-3xl border-b border-border/40 transition-all duration-500" suppressHydrationWarning>

            {/* Left: Branding & Breadcrumb */}
            <div className="flex items-center gap-4 lg:gap-6" suppressHydrationWarning>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/95 border border-primary/10 p-1 flex items-center justify-center shadow-lg shadow-primary/5">
                        <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col" suppressHydrationWarning>
                        <div className="flex items-center gap-1.5" suppressHydrationWarning>
                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 leading-none">Nexus OS 2.0</span>
                        </div>
                        <h1 className="text-sm font-black tracking-tight text-foreground mt-0.5">{title}</h1>
                    </div>
                </div>
            </div>

            {/* Center: Search / Custom Content */}
            <div className="flex-1 max-w-xl mx-4">
                {children}
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-6 lg:gap-8" suppressHydrationWarning>
                <div className="flex items-center gap-3">
                    <NotificationsDropdown />

                    <ThemeToggle />
                </div>

                <div className="h-10 w-px bg-border/40" suppressHydrationWarning />

                <div className="flex items-center gap-3 group cursor-pointer" suppressHydrationWarning>
                    <div className="text-right hidden sm:block" suppressHydrationWarning>
                        <p className="text-[10px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                            {clerkLoaded && clerkUser ? (clerkUser.fullName || 'Operador Nexus') : 'Operador Nexus'}
                        </p>
                        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">Terminal Ativo</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border-2 border-primary/20 p-1 flex items-center justify-center group-hover:border-primary/50 transition-all scale-100 group-hover:scale-105" suppressHydrationWarning>
                        {mounted && (
                            <UserButton
                                appearance={{
                                    elements: {
                                        avatarBox: "w-full h-full rounded-xl",
                                        userButtonTrigger: "w-full h-full focus:shadow-none focus:outline-none"
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

