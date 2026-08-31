'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import DynamicCatalogContent from '../c/[slug]/page'

export default function CatalogRootPage() {
    const [slug, setSlug] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMyCatalogSlug()
    }, [])

    const fetchMyCatalogSlug = async () => {
        try {
            const res = await fetch('/api/catalog/me')
            if (res.ok) {
                const data = await res.json()
                if (data.slug) {
                    setSlug(data.slug)
                    return
                }
            }
        } catch (e) {
            console.error('Error fetching my catalog slug:', e)
        } finally {
            setLoading(false)
        }
        setSlug('default')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin opacity-40" />
                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Identificando sua loja...</p>
            </div>
        )
    }

    return <DynamicCatalogContent slug={slug || 'default'} />
}
