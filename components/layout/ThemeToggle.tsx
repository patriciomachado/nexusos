'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

/**
 * The app follows the system appearance by default (dark-mode.md). This
 * button is a single, quiet override for shared shop computers.
 */
export default function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    if (!mounted) return <div className="w-11 h-11" aria-hidden />

    const isDark = resolvedTheme === 'dark'
    const label = isDark ? 'Usar aparência clara' : 'Usar aparência escura'

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={label}
            title={label}
            className="w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] active:bg-foreground/[0.08] transition-colors"
        >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    )
}
