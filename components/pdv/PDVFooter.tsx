'use client'

import { Wifi, User, Store, ShieldCheck } from 'lucide-react'

export default function PDVFooter() {
    const now = new Date()
    const year = now.getFullYear()

    return (
        <footer className="h-10 bg-background border-t border-border flex items-center px-6 justify-between shrink-0 fixed bottom-0 w-full z-20">
            <div className="flex items-center gap-6 divide-x divide-border">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                    <Wifi className="w-3 h-3" />
                    <span>Servidor Online</span>
                </div>

                <div className="flex items-center gap-2 pl-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    <User className="w-3 h-3 opacity-40" />
                    <span>Operador: <span className="text-foreground">Admin_PDV01</span></span>
                </div>

                <div className="flex items-center gap-2 pl-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    <Store className="w-3 h-3 opacity-40" />
                    <span>Loja: <span className="text-foreground">Matriz - SP</span></span>
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
