'use client'

import { Bell, Search, Command } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import ThemeToggle from './ThemeToggle'
import { UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface HeaderProps {
    title: string
}

export default function Header({ title }: HeaderProps) {
    const { user } = useAppStore()
    const { user: clerkUser } = useUser()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/service-orders?search=${encodeURIComponent(searchQuery.trim())}`)
        }
    }

    return (
        <header className="h-20 lg:h-24 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-40 bg-background/40 backdrop-blur-3xl border-b border-white/5 transition-all duration-500">

            {/* Left: Mobile Title / Breadcrumb */}
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 leading-none">Nexus OS 2.0</span>
                    </div>
                    <h1 className="text-lg font-black tracking-tighter text-foreground mt-1">{title}</h1>
                </div>
            </div>

            {/* Center: Global Search (Premium Style) */}
            <div className="flex-1 max-w-2xl px-12 hidden md:block">
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute inset-x-0 inset-y-0 bg-primary/5 rounded-[1.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        id="global-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar em todo o sistema..."
                        className="w-full bg-muted/40 border border-border/50 rounded-[1.5rem] h-12 flex items-center pl-12 pr-12 text-sm font-medium focus:outline-none focus:border-primary/30 transition-all placeholder:opacity-40"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-background/50 border border-border/50 px-2 py-1 rounded-lg opacity-40 group-focus-within:opacity-100 transition-opacity">
                        <Command className="w-3 h-3" />
                        <span className="text-[10px] font-black">K</span>
                    </div>
                </form>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-6 lg:gap-8">
                <div className="flex items-center gap-3">
                    <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all relative border border-white/5">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-primary rounded-full border-2 border-background shadow-[0_0_12px_rgba(59,130,246,0.6)]"></span>
                    </button>

                    <div className="hidden lg:block">
                        <ThemeToggle />
                    </div>
                </div>

                <div className="h-10 w-px bg-border/40" />

                <div className="flex items-center gap-4 group cursor-pointer">
                    <div className="text-right hidden sm:block">
                        <p className="text-[11px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">{clerkUser?.fullName || 'Nexus Operator'}</p>
                        <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">Terminal Ativo</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/20 p-1 flex items-center justify-center group-hover:border-primary/50 transition-all scale-100 group-hover:scale-110">
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-full h-full rounded-xl",
                                    userButtonTrigger: "w-full h-full focus:shadow-none focus:outline-none"
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </header>
    )
}

