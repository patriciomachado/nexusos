'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Inbox, ClipboardList, Package, Calendar, DollarSign, ListChecks } from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/types'

const ENTITY_META: Record<string, { icon: React.ComponentType<{ className?: string }>; tint: string; href: (n: Notification) => string }> = {
    service_order: { icon: ClipboardList, tint: 'bg-blue-500', href: n => `/service-orders/${n.related_entity_id}` },
    low_stock: { icon: Package, tint: 'bg-orange-500', href: () => '/inventory?filter=low_stock' },
    appointments_tomorrow: { icon: Calendar, tint: 'bg-purple-500', href: () => '/appointments' },
    pending_payments: { icon: DollarSign, tint: 'bg-green-500', href: () => '/reports' },
    task: { icon: ListChecks, tint: 'bg-red-500', href: n => `/tarefas?task=${n.related_entity_id}` },
}

// framer-motion's typings don't accept DOM props with React 19 here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MotionDiv = motion.div as any

export default function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore()
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        fetchNotifications()
        const id = setInterval(() => {
            if (document.visibilityState === 'visible') fetchNotifications()
        }, 60_000)
        return () => clearInterval(id)
    }, [fetchNotifications])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false)
        }
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKey)
        }
    }, [])

    const handleNotificationClick = async (notification: Notification) => {
        setIsOpen(false)
        await markAsRead(notification.id)
        const meta = notification.related_entity_type ? ENTITY_META[notification.related_entity_type] : undefined
        if (meta) router.push(meta.href(notification))
    }

    return (
        <div className="relative" ref={dropdownRef} suppressHydrationWarning>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
                aria-expanded={isOpen}
                className={cn(
                    'w-11 h-11 flex items-center justify-center rounded-full transition-colors relative',
                    isOpen ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]'
                )}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-background tabular-nums">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.16 }}
                        className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-96 rounded-2xl material-thick border border-border/70 shadow-2xl z-50 overflow-hidden"
                        role="dialog"
                        aria-label="Notificações"
                    >
                        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                            <h3 className="type-headline text-foreground">Notificações</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[15px] text-primary hover:opacity-80 transition-opacity"
                                >
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>

                        <div className="max-h-[420px] overflow-y-auto pb-2">
                            {isLoading ? (
                                <div className="p-8 flex justify-center">
                                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" aria-label="Carregando" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="px-6 py-10 flex flex-col items-center text-center gap-2">
                                    <Inbox className="w-8 h-8 text-muted-foreground" />
                                    <p className="type-headline text-foreground">Tudo em dia</p>
                                    <p className="text-sm text-muted-foreground">Você não tem notificações.</p>
                                </div>
                            ) : (
                                <ul>
                                    {notifications.map((notification, idx) => {
                                        const meta = notification.related_entity_type ? ENTITY_META[notification.related_entity_type] : undefined
                                        const Icon = meta?.icon ?? Bell
                                        const unread = notification.status !== 'read'
                                        return (
                                            <li key={notification.id} className="relative">
                                                {idx > 0 && <div className="absolute left-[60px] right-0 top-0 h-px bg-border/70" aria-hidden />}
                                                <button
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className="w-full text-left flex gap-3 px-4 py-3 hover:bg-foreground/[0.04] active:bg-foreground/[0.07] transition-colors"
                                                >
                                                    <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5', meta?.tint ?? 'bg-zinc-500')}>
                                                        <Icon className="w-4 h-4" />
                                                    </span>
                                                    <span className="flex-1 min-w-0">
                                                        <span className="flex items-baseline justify-between gap-2">
                                                            <span className={cn('text-[15px] truncate', unread ? 'font-semibold text-foreground' : 'text-foreground/90')}>
                                                                {notification.title || 'Aviso'}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                {notification.created_at ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: false, locale: ptBR }) : 'agora'}
                                                            </span>
                                                        </span>
                                                        <span className="block text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                                            {notification.message}
                                                        </span>
                                                    </span>
                                                    {unread && <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2" aria-label="Não lida" />}
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    )
}
