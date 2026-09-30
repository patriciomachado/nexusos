'use client'

import { Search } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

interface SearchInputProps {
    placeholder?: string
    className?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    syncWithUrl?: boolean
}

export default function SearchInput({
    placeholder = "Pesquisar…",
    className = "w-full h-10 bg-foreground/[0.06] border border-transparent rounded-xl pl-10 pr-3 md:text-[15px] text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/15 transition-colors",
    value,
    onChange,
    syncWithUrl = true
}: SearchInputProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [isPending, startTransition] = useTransition()
    const [searchTerm, setSearchTerm] = useState(searchParams?.get('search') || '')

    // Update local state if URL changes externally
    useEffect(() => {
        if (syncWithUrl) {
            setSearchTerm(searchParams?.get('search') || '')
        }
    }, [searchParams, syncWithUrl])

    const handleSearch = useCallback((term: string) => {
        const params = new URLSearchParams(searchParams || undefined)
        if (term) {
            params.set('search', term)
        } else {
            params.delete('search')
        }

        // We use transition so the UI remains responsive while the server re-renders the page
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`)
        })
    }, [pathname, router, searchParams])

    // Local debounce effect to prevent excessive URL updates
    useEffect(() => {
        if (!syncWithUrl) return

        const timeoutId = setTimeout(() => {
            if (searchTerm !== (searchParams?.get('search') || '')) {
                handleSearch(searchTerm)
            }
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, searchParams, handleSearch, syncWithUrl])

    return (
        <div className="relative w-full group">
            <Search aria-hidden className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isPending ? 'text-primary animate-pulse' : 'text-muted-foreground group-focus-within:text-primary'}`} />
            <input
                type="search"
                aria-label={placeholder.replace(/…$/, '')}
                autoComplete="off"
                placeholder={placeholder}
                value={value !== undefined ? value : searchTerm}
                onChange={onChange || ((e) => setSearchTerm(e.target.value))}
                className={className}
            />
        </div>
    )
}
