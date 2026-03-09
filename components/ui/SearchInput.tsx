'use client'

import { Search } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

interface SearchInputProps {
    placeholder?: string
    className?: string
}

export default function SearchInput({
    placeholder = "Pesquisar...",
    className = "w-full bg-muted/40 border border-border rounded-3xl py-3 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all backdrop-blur-md"
}: SearchInputProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [isPending, startTransition] = useTransition()
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

    // Update local state if URL changes externally
    useEffect(() => {
        setSearchTerm(searchParams.get('search') || '')
    }, [searchParams])

    const handleSearch = useCallback((term: string) => {
        const params = new URLSearchParams(searchParams)
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
        const timeoutId = setTimeout(() => {
            if (searchTerm !== (searchParams.get('search') || '')) {
                handleSearch(searchTerm)
            }
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, searchParams, handleSearch])

    return (
        <div className="relative w-full group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isPending ? 'text-primary animate-pulse' : 'text-muted-foreground/50 group-focus-within:text-primary'}`} />
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={className}
            />
        </div>
    )
}
