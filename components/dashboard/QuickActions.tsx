'use client'

import Link from 'next/link'
import { ClipboardPlus, ListPlus, ShoppingCart, UserPlus } from 'lucide-react'
import { openQuickAdd } from '@/components/tasks/QuickAddDialog'

const tile = 'flex flex-col items-center gap-1.5 min-w-0'
const circle = 'w-14 h-14 rounded-2xl flex items-center justify-center transition-transform active:scale-95'

/** The four things done most from the dashboard, one tap each. */
export default function QuickActions() {
    return (
        <nav aria-label="Atalhos" className="grid grid-cols-4 gap-2">
            <Link href="/service-orders/new" className={tile}>
                <span className={`${circle} bg-primary text-primary-foreground shadow-sm shadow-primary/30`}><ClipboardPlus className="w-6 h-6" /></span>
                <span className="text-[13px] font-medium truncate">Nova OS</span>
            </Link>
            <Link href="/pdv" className={tile}>
                <span className={`${circle} bg-card border border-border/60 text-emerald-600 dark:text-emerald-400`}><ShoppingCart className="w-6 h-6" /></span>
                <span className="text-[13px] font-medium truncate">Vender</span>
            </Link>
            <button type="button" onClick={openQuickAdd} className={tile}>
                <span className={`${circle} bg-card border border-border/60 text-orange-600 dark:text-orange-400`}><ListPlus className="w-6 h-6" /></span>
                <span className="text-[13px] font-medium truncate">Tarefa</span>
            </button>
            <Link href="/customers/new" className={tile}>
                <span className={`${circle} bg-card border border-border/60 text-sky-600 dark:text-sky-400`}><UserPlus className="w-6 h-6" /></span>
                <span className="text-[13px] font-medium truncate">Cliente</span>
            </Link>
        </nav>
    )
}
