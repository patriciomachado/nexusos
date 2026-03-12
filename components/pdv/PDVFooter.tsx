'use client'

import { Wifi, User, Store, ShieldCheck, Loader2 } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function PDVFooter() {
    const { user: clerkUser, isLoaded } = useUser()
    const [companyName, setCompanyName] = useState('NEXUS MATRIZ')
    const [loading, setLoading] = useState(true)
    const now = new Date()
    const year = now.getFullYear()

    useEffect(() => {
        async function fetchCompany() {
            try {
                const res = await fetch('/api/auth/me')
                const data = await res.json()
                if (data?.company?.name) {
                    setCompanyName(data.company.name)
                }
            } catch (err) {
                console.error('Error fetching company:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchCompany()
    }, [])

    return (
        <footer className="h-10 bg-background border-t border-border flex items-center px-6 justify-between shrink-0 fixed bottom-0 w-full z-20">
            <div className="flex items-center gap-6 divide-x divide-border">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                    <Wifi className="w-3 h-3" />
                    <span>Servidor Online</span>
                </div>

                <div className="flex items-center gap-2 pl-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    <User className="w-3 h-3 opacity-40" />
                    <span>Operador: <span className="text-foreground">{!isLoaded ? 'Carregando...' : (clerkUser?.fullName || 'Operador')}</span></span>
                </div>

                <div className="flex items-center gap-2 pl-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    <Store className="w-3 h-3 opacity-40" />
                    <span>Loja: {loading ? <Loader2 className="w-2 h-2 animate-spin inline ml-1" /> : <span className="text-foreground">{companyName}</span>}</span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 opacity-40" />
                    <span>V: 2.4.0-STABLE</span>
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground border-l border-border pl-6">
                    NEXUS OS © {year} • <span className="text-primary opacity-60">Excellence in Retail</span>
                </div>
            </div>
        </footer>
    )
}
