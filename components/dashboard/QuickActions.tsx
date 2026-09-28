'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardPlus, ListPlus, Receipt, ShoppingCart, UserPlus } from 'lucide-react'
import { openQuickAdd } from '@/components/tasks/QuickAddDialog'
import QuickQuoteSheet from './QuickQuoteSheet'

const tile = 'flex flex-col items-center gap-1.5 min-w-0'
const circle = 'w-14 h-14 rounded-2xl flex items-center justify-center transition-transform active:scale-95'

/** The five things done most from the dashboard, one tap each. */
export default function QuickActions() {
    const [quoting, setQuoting] = useState(false)
    return (
        <>
            <nav aria-label="Atalhos" className="grid grid-cols-5 gap-2">
                <Link href="/service-orders/new" className={tile}>
                    <span className={`${circle} bg-primary text-primary-foreground shadow-sm shadow-primary/30`}><ClipboardPlus className="w-6 h-6" /></span>
                    <span className="text-[13px] font-medium truncate">Nova OS</span>
                </Link>
                <Link href="/pdv" className={tile}>
                    <span className={`${circle} bg-card border border-border/60 text-emerald-600 dark:text-emerald-400`}><ShoppingCart className="w-6 h-6" /></span>
                    <span className="text-[13px] font-medium truncate">Vender</span>
                </Link>
                <button type="button" onClick={() => setQuoting(true)} className={tile}>
                    <span className={`${circle} bg-card border border-border/60 text-violet-600 dark:text-violet-400`}><Receipt className="w-6 h-6" /></span>
                    <span className="text-[13px] font-medium truncate">Cotar</span>
                </button>
                <button type="button" onClick={openQuickAdd} className={tile}>
                    <span className={`${circle} bg-card border border-border/60 text-orange-600 dark:text-orange-400`}><ListPlus className="w-6 h-6" /></span>
                    <span className="text-[13px] font-medium truncate">Tarefa</span>
                </button>
                <Link href="/customers/new" className={tile}>
                    <span className={`${circle} bg-card border border-border/60 text-sky-600 dark:text-sky-400`}><UserPlus className="w-6 h-6" /></span>
                    <span className="text-[13px] font-medium truncate">Cliente</span>
                </Link>
            </nav>
            <QuickQuoteSheet open={quoting} onClose={() => setQuoting(false)} />
        </>
    )
}
