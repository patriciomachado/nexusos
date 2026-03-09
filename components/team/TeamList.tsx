'use client'

import { useState, useEffect } from 'react'
import { MoreVertical, User, Mail, ShieldCheck, Phone, Trash2, Edit2, Loader2 } from 'lucide-react'
import { User as UserType, UserRole } from '@/types'
import { toast } from 'sonner'

interface TeamListProps {
    users: UserType[]
    onEdit: (user: UserType) => void
    onRefresh: () => void
}

const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    technician: 'Técnico',
    cashier: 'Operador de Caixa',
    customer: 'Cliente',
    attendant: 'Atendente'
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {users.map((user) => (
                <div
                    key={user.id}
                    className="group relative bg-card border border-border rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl hover:border-primary/20 transition-all duration-300 overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full opacity-5 transition-opacity group-hover:opacity-10 ${user.role === 'admin' ? 'bg-rose-500' : 'bg-primary'}`} />

                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-black text-2xl border border-border group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all shadow-inner">
                                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">{user.full_name || 'Membro sem nome'}</h3>
                                <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${roleColors[user.role]}`}>
                                    {roleLabels[user.role]}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                            <button
                                onClick={() => onEdit(user)}
                                className="p-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-all"
                                title="Editar membro"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(user.id)}
                                disabled={deletingId === user.id}
                                className="p-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-destructive transition-all"
                                title="Remover membro"
                            >
                                {deletingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate">{user.email}</span>
                        </div>
                        {user.phone && (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
                                <Phone className="w-4 h-4 shrink-0" />
                                {user.phone}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {user.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                            {mounted
                                ? `Desde ${new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
                                : '--'
                            }
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )
}
