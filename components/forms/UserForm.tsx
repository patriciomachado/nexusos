'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, User, Mail, Phone, ShieldCheck, Save, Loader2 } from 'lucide-react'
import { PremiumInput } from '@/components/ui/PremiumInput'
import { User as UserType } from '@/types'
import { cn } from '@/lib/utils'

interface UserFormProps {
    initial?: Partial<UserType>
    onSuccess?: () => void
    onCancel?: () => void
}

export default function UserForm({ initial, onSuccess, onCancel }: UserFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        full_name: initial?.full_name || '',
        email: initial?.email || '',
        phone: initial?.phone || '',
        role: initial?.role || 'technician',
        is_active: initial?.is_active ?? true
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            const url = initial?.id ? `/api/users/${initial.id}` : '/api/users'
            const method = initial?.id ? 'PATCH' : 'POST'

            try {
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                })

                const data = await res.json()

                if (res.ok) {
                    toast.success(initial?.id ? 'Membro da equipe atualizado!' : 'Membro convidado com sucesso!')
                    if (onSuccess) onSuccess()
                    router.refresh()
                } else {
                    throw new Error(data.error || 'Erro ao salvar membro')
                }
            } catch (error: any) {
                const errorMsg = error?.message || error?.error || 'Erro ao salvar membro da equipe'
                toast.error(errorMsg)
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest ml-2">Nome Completo</label>
                    <PremiumInput
                        required
                        value={form.full_name}
                        onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                        icon={<User className="w-4 h-4" />}
                        placeholder="Ex: João Silva"
                    />
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest ml-2">E-mail de Acesso</label>
                    <PremiumInput
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        icon={<Mail className="w-4 h-4" />}
                        placeholder="email@empresa.com"
                        disabled={!!initial?.id} // Email shouldn't be changed if user exists
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest ml-2">Cargo / Permissões</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <select
                            value={form.role}
                            onChange={e => setForm(p => ({ ...p, role: e.target.value as any }))}
                            className="w-full h-12 bg-muted/40 border border-border rounded-xl pl-11 pr-4 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                        >
                            <option value="technician">Técnico</option>
                            <option value="cashier">Operador de Caixa</option>
                            <option value="attendant">Atendente (OS e PDV)</option>
                            <option value="manager">Gerente</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest ml-2">Telefone</label>
                    <PremiumInput
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        icon={<Phone className="w-4 h-4" />}
                        placeholder="(00) 00000-0000"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest ml-2">Status da Conta</label>
                    <div 
                        onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                        className={cn(
                            "w-full h-12 px-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                            form.is_active 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                        )}
                    >
                        <span className="text-xs font-black uppercase tracking-widest">
                            {form.is_active ? 'Totalmente Ativo' : 'Inativo / Bloqueado'}
                        </span>
                        <div className={cn(
                            "w-10 h-5 rounded-full relative transition-colors p-1",
                            form.is_active ? "bg-emerald-500" : "bg-rose-500"
                        )}>
                            <div className={cn(
                                "w-3 h-3 bg-white rounded-full transition-all",
                                form.is_active ? "ml-5" : "ml-0"
                            )} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-border">
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-primary text-primary-foreground h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {initial?.id ? 'ATUALIZAR' : 'CONVIDAR MEMBRO'}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-8 h-14 rounded-2xl bg-muted text-muted-foreground font-black text-xs uppercase tracking-widest hover:bg-muted/80 transition-all"
                    >
                        CANCELAR
                    </button>
                )}
            </div>
        </form>
    )
}
