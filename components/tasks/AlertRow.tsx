'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
    ClipboardList, Calendar, Package, DollarSign, Wallet, Smartphone, HeartHandshake, Cake,
    Plus, MoreHorizontal, ChevronRight, Clock, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODULE_META, type TaskAlert, type AlertModule } from '@/lib/tasks/types'
import { addDays, weekdayOf } from '@/lib/tasks/dates'

const MODULE_ICON: Record<AlertModule, React.ComponentType<{ className?: string }>> = {
    service_orders: ClipboardList,
    appointments: Calendar,
    inventory: Package,
    payments: DollarSign,
    cash: Wallet,
    devices: Smartphone,
    post_sales: HeartHandshake,
    customers: Cake,
}

interface AlertRowProps {
    alert: TaskAlert
    today: string
    onConvert: (alert: TaskAlert) => void
    onSnooze: (alert: TaskAlert, until: string) => void
    onDismiss: (alert: TaskAlert) => void
}

export function ModuleTile({ module, className }: { module: AlertModule; className?: string }) {
    const Icon = MODULE_ICON[module]
    return (
        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0', MODULE_META[module].tint, className)} aria-hidden>
            <Icon className="w-4 h-4" />
        </span>
    )
}

export default function AlertRow({ alert, today, onConvert, onSnooze, onDismiss }: AlertRowProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!menuOpen) return
        const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', esc)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', esc)
        }
    }, [menuOpen])

    const nextMonday = addDays(today, ((8 - weekdayOf(today)) % 7) || 7)

    return (
        <div className="group relative flex items-start gap-3 px-4 py-3">
            <ModuleTile module={alert.module} className="mt-0.5" />
            <Link href={alert.href} className="flex-1 min-w-0 -my-1 py-1 rounded-md">
                <span className="flex items-center gap-1.5">
                    {alert.severity === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" aria-label="Prioridade alta" />}
                    <span className="text-[15px] leading-snug text-foreground truncate">{alert.title}</span>
                </span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground line-clamp-2">
                    {alert.time && alert.date === today && <span className="tabular-nums">{alert.time} · </span>}
                    {alert.detail}
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground inline-flex items-center gap-0.5">
                    {MODULE_META[alert.module].label}
                    <ChevronRight className="w-3 h-3" />
                </span>
            </Link>
            <div className="flex items-center gap-0.5 shrink-0 -mr-2" ref={menuRef}>
                <button
                    type="button"
                    onClick={() => onConvert(alert)}
                    className="h-9 px-2.5 rounded-full text-[13px] font-medium text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1"
                    title="Adicionar às tarefas de hoje"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Tarefa</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label="Mais opções"
                    aria-expanded={menuOpen}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.05] transition-colors"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>
                {menuOpen && (
                    <div role="menu" className="absolute right-3 top-12 z-30 w-60 rounded-xl material-thick border border-border/70 shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150">
                        <MenuItem icon={Clock} label="Adiar para amanhã" onClick={() => { setMenuOpen(false); onSnooze(alert, addDays(today, 1)) }} />
                        <MenuItem icon={Clock} label="Adiar para segunda" onClick={() => { setMenuOpen(false); onSnooze(alert, nextMonday) }} />
                        <MenuItem icon={Calendar} label="Virar tarefa para amanhã" onClick={() => { setMenuOpen(false); onConvert({ ...alert, date: addDays(today, 1) }) }} />
                        {alert.dismissible && (
                            <>
                                <div className="my-1 h-px bg-border/70" />
                                <MenuItem icon={CheckCircle2} label="Marcar como resolvido" onClick={() => { setMenuOpen(false); onDismiss(alert) }} />
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function MenuItem({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 h-10 text-[15px] text-foreground hover:bg-foreground/[0.06] text-left"
        >
            <Icon className="w-4 h-4 text-muted-foreground" />
            {label}
        </button>
    )
}
