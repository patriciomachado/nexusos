'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PowerOff } from 'lucide-react'
import Header from '@/components/layout/Header'
import { offModuleFor } from './nav-config'

/** A page of a module the store turned off shows why, instead of the page. */
export default function ModuleGuard({ off, canEdit, children }: { off: string[]; canEdit: boolean; children: React.ReactNode }) {
    const pathname = usePathname()
    const mod = off.length ? offModuleFor(pathname, off) : null
    if (!mod) return <>{children}</>
    return (
        <div className="min-h-full bg-background">
            <Header title={mod.label} />
            <div className="max-w-md mx-auto px-6 py-16 text-center space-y-4">
                <span className="mx-auto w-14 h-14 rounded-full bg-foreground/[0.06] text-muted-foreground flex items-center justify-center">
                    <PowerOff aria-hidden className="w-7 h-7" />
                </span>
                <h2 className="type-title3 text-balance">{mod.label} está desativado</h2>
                <p className="text-[15px] text-muted-foreground text-pretty">
                    {canEdit ? 'Você desligou este módulo em Configurações → Módulos. Os dados continuam guardados; é só ligar de novo.' : 'O dono da loja desligou este módulo.'}
                </p>
                {canEdit && (
                    <Link href="/settings/modulos" className="inline-flex h-12 px-6 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold items-center justify-center hover:opacity-90 transition-opacity">
                        Abrir Módulos
                    </Link>
                )}
            </div>
        </div>
    )
}
