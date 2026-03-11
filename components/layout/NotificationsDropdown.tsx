'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, ExternalLink, Inbox, Clock } from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'
import { useAppStore } from '@/store/appStore'
import { useUser } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const { user: clerkUser } = useUser()
    const { user: appUser } = useAppStore()
    const { notifications, unreadCount, fetchNotifications, markAsRead, isLoading } = useNotificationStore()
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const idToUse = appUser?.id || clerkUser?.id
        if (idToUse) {
            fetchNotifications(idToUse)
        }
    }, [clerkUser?.id, appUser?.id, fetchNotifications])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleDropdown = () => setIsOpen(!isOpen)

    return (
        <div className="relative" ref={dropdownRef} suppressHydrationWarning>
            {/* Bell Trigger */}
            <button
                onClick={toggleDropdown}
                className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative border border-white/5",
                    isOpen
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted/40 text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                )}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-4 w-80 sm:w-96 rounded-2xl bg-background/80 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Notificações</h3>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-tighter">
                                        {unreadCount} Novas
                                    </span>
                                )}
                            </div>
                            <button className="text-[10px] font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                                Marcar tudo como lido
                            </button>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto scrollbar-hide py-2">
                            {isLoading ? (
                                <div className="p-8 flex flex-col items-center justify-center gap-3">
                                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Carregando...</span>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 flex flex-col items-center justify-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center">
                                        <Inbox className="w-6 h-6 text-muted-foreground/40" />
                                    </div>
                                    <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest text-center">Nenhuma notificação por aqui</span>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={cn(
                                            "p-4 hover:bg-white/5 transition-all cursor-pointer relative group",
                                            notification.status !== 'read' && "bg-primary/5"
                                        )}
                                    >
                                        <div className="flex gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5",
                                                notification.status !== 'read' ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"
                                            )}>
                                                <Bell className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-black text-foreground uppercase tracking-tight truncate">
                                                        {notification.title || 'Alerta do Sistema'}
                                                    </p>
                                                    <span className="text-[10px] font-bold text-muted-foreground/40 whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </div>
                                        {notification.status !== 'read' && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/5 bg-white/5">
                            <button className="w-full py-2 rounded-xl bg-muted/40 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2">
                                Ver todas as atividades <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function ChevronRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}
