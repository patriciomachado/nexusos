'use client'

import { Menu, Bell, Search } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import ThemeToggle from './ThemeToggle'
import { UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface HeaderProps {
    title: string
}

export default function Header({ title }: HeaderProps) {
    const { sidebarOpen, setSidebarOpen } = useAppStore()
    const { user } = useUser()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/service-orders?search=${encodeURIComponent(searchQuery.trim())}`)
        }
    }

    return (
        <header className="h-16 lg:h-20 border-b border-border bg-background/80 backdrop-blur-2xl flex items-center px-4 lg:px-8 gap-4 lg:gap-8 sticky top-0 z-10 shadow-sm transition-colors duration-500">
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-10 h-10 hidden lg:flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border"
            >
                <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 flex items-center gap-8">
                <h1 className="text-sm font-black tracking-[0.2em] text-foreground uppercase hidden md:block border-r border-border pr-8">{title}</h1>

                {/* Search Bar - Stylized */}
                <form onSubmit={handleSearch} className="relative max-w-md w-full hidden lg:block group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors cursor-text" onClick={() => document.getElementById('global-search')?.focus()} />
                    <input
                        id="global-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar em Nexus OS..."
                        className="w-full bg-muted border border-border rounded-xl py-2.5 pl-11 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:bg-card transition-all font-medium"
                    />
                </form>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all relative border border-border">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-background shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                    </button>
                </div>

                <div className="h-10 w-px bg-border mx-2" />

                <ThemeToggle />

                <div className="h-10 w-px bg-border mx-2" />

                {/* Profile Button */}
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-foreground uppercase leading-none">{user?.fullName || 'Carregando...'}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">{user ? 'Conectado' : 'Aguarde'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors">
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-full h-full rounded-none",
                                    userButtonTrigger: "w-full h-full focus:shadow-none focus:outline-none"
                                }
                            }}
                            userProfileMode="navigation"
                            userProfileUrl="/profile"
                        />
                    </div>
                </div>
            </div>
        </header>
    )
}
