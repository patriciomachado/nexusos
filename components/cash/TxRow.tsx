'use client'

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Amount } from '@/components/dashboard/Privacy'
import { cn } from '@/lib/utils'
import { type CashTx, cleanDescription, isCostRecord, methodShort, num, sourceLabel, timeOf } from './cash-utils'

/** One cash movement as a list row. Automatic cost records are shown muted. */
export default function TxRow({ tx, onClick, showDate }: { tx: CashTx; onClick?: () => void; showDate?: boolean }) {
    const entry = tx.type === 'entry'
    const cost = isCostRecord(tx)
    return (
        <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.04]">
            <span className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                cost ? 'bg-foreground/[0.06] text-muted-foreground'
                    : entry ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/12 text-red-600 dark:text-red-400'
            )}>
                {entry ? <ArrowDownLeft className="w-[18px] h-[18px]" /> : <ArrowUpRight className="w-[18px] h-[18px]" />}
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium truncate">{cleanDescription(tx)}</span>
                <span className="block text-[13px] text-muted-foreground truncate">{showDate ? new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' : ''}{timeOf(tx.created_at)} · {sourceLabel(tx)} · {methodShort(tx)}</span>
            </span>
            <span className={cn(
                'text-[15px] font-semibold tabular-nums shrink-0',
                cost ? 'text-muted-foreground' : entry ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
                {entry ? '+' : '−'}<Amount value={num(tx.amount)} plain className="ml-0.5" />
            </span>
        </button>
    )
}
