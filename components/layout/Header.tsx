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
}

export default function Header({ title, subtitle }: HeaderProps) {
    const { user } = useAppStore()
    const { user: clerkUser } = useUser()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <header className="h-14 lg:h-18 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40 bg-background/40 backdrop-blur-3xl border-b border-border/40 transition-all duration-500" suppressHydrationWarning>

            {/* Left: Mobile Title / Breadcrumb */}
            <div className="flex items-center gap-6" suppressHydrationWarning>
                <div className="flex flex-col" suppressHydrationWarning>
                    <div className="flex items-center gap-2" suppressHydrationWarning>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 leading-none">Nexus OS 2.0</span>
                    </div>
                    <h1 className="text-base font-black tracking-tighter text-foreground mt-0.5">{title}</h1>
                    {subtitle && <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">{subtitle}</p>}
                </div>
            </div>

            {/* Space for layout balance */}
            <div className="flex-1" />

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-6 lg:gap-8" suppressHydrationWarning>
                <div className="flex items-center gap-3">
                    <NotificationsDropdown />

                    <div className="hidden lg:block">
                        <ThemeToggle />
                    </div>
                </div>

                <div className="h-10 w-px bg-border/40" suppressHydrationWarning />

                <div className="flex items-center gap-3 group cursor-pointer" suppressHydrationWarning>
                    <div className="text-right hidden sm:block" suppressHydrationWarning>
                        <p className="text-[10px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                            {mounted ? (clerkUser?.fullName || 'Nexus Operator') : 'Nexus Operator'}
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

