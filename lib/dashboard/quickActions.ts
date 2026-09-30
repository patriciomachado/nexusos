import type { ComponentType } from 'react'
import { CalendarClock, ClipboardPlus, ListPlus, Receipt, ShoppingCart, Smartphone, UserPlus, Wallet, Wrench } from 'lucide-react'

export interface QuickAction {
    id: string
    label: string
    icon: ComponentType<{ className?: string }>
    circleClass: string
    kind: 'link' | 'quote' | 'task'
    href?: string
}

const circle = 'w-14 h-14 rounded-2xl flex items-center justify-center transition-transform active:scale-95'
const card = `${circle} bg-card border border-border/60`

/** Todos os atalhos disponíveis pra escolher no dashboard. */
export const QUICK_ACTIONS: QuickAction[] = [
    { id: 'nova-os', label: 'Nova OS', icon: ClipboardPlus, circleClass: `${circle} bg-primary text-primary-foreground shadow-sm shadow-primary/30`, kind: 'link', href: '/service-orders/new' },
    { id: 'vender', label: 'Vender', icon: ShoppingCart, circleClass: `${card} text-emerald-600 dark:text-emerald-400`, kind: 'link', href: '/pdv' },
    { id: 'cotar', label: 'Cotar', icon: Receipt, circleClass: `${card} text-violet-600 dark:text-violet-400`, kind: 'quote' },
    { id: 'tarefa', label: 'Tarefa', icon: ListPlus, circleClass: `${card} text-orange-600 dark:text-orange-400`, kind: 'task' },
    { id: 'cliente', label: 'Cliente', icon: UserPlus, circleClass: `${card} text-sky-600 dark:text-sky-400`, kind: 'link', href: '/customers/new' },
    { id: 'agenda', label: 'Agenda', icon: CalendarClock, circleClass: `${card} text-rose-600 dark:text-rose-400`, kind: 'link', href: '/agenda' },
    { id: 'caixa', label: 'Caixa', icon: Wallet, circleClass: `${card} text-green-600 dark:text-green-400`, kind: 'link', href: '/cash-register' },
    { id: 'aparelho', label: 'Aparelho', icon: Smartphone, circleClass: `${card} text-cyan-600 dark:text-cyan-400`, kind: 'link', href: '/devices' },
    { id: 'pecas', label: 'Peças', icon: Wrench, circleClass: `${card} text-teal-600 dark:text-teal-400`, kind: 'link', href: '/pecas' },
]

export const DEFAULT_QUICK_ACTIONS = ['nova-os', 'vender', 'cotar', 'tarefa']
