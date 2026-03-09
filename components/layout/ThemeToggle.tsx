'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 animate-pulse" />

    const themes = [
        { id: 'light', icon: Sun, label: 'Luz' },
        { id: 'dark', icon: Moon, label: 'Noite' },
        { id: 'system', icon: Monitor, label: 'Auto' },
    ]

    return (
        <div className="flex items-center p-1 bg-muted/50 border border-border rounded-2xl gap-1">
            {themes.map((t) => {
                const Icon = t.icon
                const isActive = theme === t.id
                return (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        title={t.label}
                        className={cn(
                            "p-2 rounded-xl transition-all duration-300 relative group",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-background"
                        )}
                    >
                        <Icon className="w-4 h-4 relative z-10" />
                        {!isActive && (
                            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-[10px] font-black text-popover-foreground rounded-md border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                {t.label}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
