'use client'

import { useState, useEffect } from 'react'
import { MoreVertical, User, Mail, ShieldCheck, Phone, Trash2, Edit2, Loader2, Calendar, Star, CheckCircle2 } from 'lucide-react'
import { User as UserType, UserRole } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TeamListProps {
    users: UserType[]
    onEdit: (user: UserType) => void
    onRefresh: () => void
}

const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    technician: 'Técnico Especialista',
    cashier: 'Operador de Fluxo',
    customer: 'Cliente Final',
    attendant: 'Atendimento & Suporte'
}

const roleColors: Record<UserRole, string> = {
    admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    manager: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    technician: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    cashier: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    customer: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    attendant: 'bg-teal-500/10 text-teal-500 border-teal-500/20'
}

export default function TeamList({ users, onEdit, onRefresh }: TeamListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja remover este membro da equipe?')) return

        setDeletingId(id)
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Membro removido!')
                onRefresh()
            } else {
                const data = await res.json()
                throw new Error(data.error || 'Erro ao remover membro')
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {users.map((user) => (
                <div
                    key={user.id}
                    className="group relative bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 shadow-2xl hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] hover:border-primary/30 transition-all duration-500 overflow-hidden"
                >
                    {/* Background Glow Overlay */}
                    <div className={cn(
                        "absolute -top-24 -right-24 w-64 h-64 blur-[100px] rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-10",
                        user.role === 'admin' ? 'bg-rose-500' : 'bg-primary'
                    )} />

                    <div className="relative space-y-8">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center text-primary font-black text-3xl border border-primary/20 group-hover:scale-110 transition-transform shadow-inner relative">
                                    {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                    {user.is_active && (
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-card rounded-full shadow-lg" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-xl text-foreground tracking-tighter group-hover:text-primary transition-colors line-clamp-1">{user.full_name || 'Membro Nexus'}</h3>
                                        {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-rose-500" />}
                                    </div>
                                    <div className={cn(
                                        "inline-flex px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border",
                                        roleColors[user.role]
                                    )}>
                                        {roleLabels[user.role]}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => onEdit(user)}
                                    className="p-3 rounded-2xl bg-white/5 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                                    title="Configurações"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(user.id)}
                                    disabled={deletingId === user.id}
                                    className="p-3 rounded-2xl bg-white/5 text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                                    title="Remover"
                                >
                                    {deletingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-primary/5 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-muted-foreground/30 group-hover:text-primary transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-foreground/60 truncate tracking-tight">{user.email}</span>
                            </div>
                            {user.phone && (
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-primary/5 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-muted-foreground/30 group-hover:text-primary transition-colors">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-foreground/60 tracking-tight">{user.phone}</span>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-full border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    {user.is_active ? 'Totalmente Ativo' : 'Pendente'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground/30">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {mounted
                                        ? `Desde ${new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
                                        : '--'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Interaction Glow Layer */}
                    <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/30 rounded-[3rem] pointer-events-none transition-all duration-500" />
                </div>
            ))}
        </div>
    )
}

