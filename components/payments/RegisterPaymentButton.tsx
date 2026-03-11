'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X, DollarSign, CreditCard, User, Hash, Notebook, Loader2 } from 'lucide-react'
import { PAYMENT_METHOD_LABELS, cn } from '@/lib/utils'

interface Props {
    customers: Array<{ id: string; name: string }>
    orders: Array<{ id: string; order_number: string; title: string }>
    companyId: string
}

export default function RegisterPaymentButton({ customers, orders, companyId }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        customer_id: '',
        service_order_id: '',
        amount: '',
        payment_method: 'pix',
        payment_status: 'completed',
        notes: '',
    })

    // Prevent scroll when modal is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [open])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Valor inválido'); return }
        startTransition(async () => {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, amount: parseFloat(form.amount), company_id: companyId }),
            })
            if (res.ok) {
                toast.success('Pagamento registrado!')
                setOpen(false)
                router.refresh()
            } else {
                toast.error('Erro ao registrar pagamento')
            }
        })
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="group relative flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_20px_40px_rgba(var(--primary),0.3)] hover:shadow-primary/40"
            >
                <div className="p-1.5 rounded-lg bg-white/20 group-hover:rotate-90 transition-transform duration-500">
                    <Plus className="w-4 h-4" />
                </div>
                Registrar Pagamento
            </button>

            {open && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#050508]/80 backdrop-blur-md animate-in fade-in duration-500"
                        onClick={() => setOpen(false)}
                    />

                    <div
                        className="relative w-full max-w-xl bg-card border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-500"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />

                        <div className="relative p-10">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-3xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                                        <DollarSign className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-foreground tracking-tighter uppercase">Novo Recebimento</h3>
                                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.3em] mt-1">Fluxo Financeiro Nexus</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-3 hover:bg-white/5 rounded-2xl transition-all text-muted-foreground/40 hover:text-foreground"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Cliente */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                            <User className="w-3 h-3 text-primary/40" />
                                            Cliente
                                        </label>
                                        <select
                                            value={form.customer_id}
                                            onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}
                                            className="w-full bg-muted/30 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-foreground focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="" className="bg-card">Selecionar cliente...</option>
                                            {customers.map(c => <option key={c.id} value={c.id} className="bg-card">{c.name}</option>)}
                                        </select>
                                    </div>

                                    {/* OS */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                            <Hash className="w-3 h-3 text-primary/40" />
                                            Ordem de Serviço
                                        </label>
                                        <select
                                            value={form.service_order_id}
                                            onChange={e => setForm(p => ({ ...p, service_order_id: e.target.value }))}
                                            className="w-full bg-muted/30 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-foreground focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="" className="bg-card">Sem OS vinculada</option>
                                            {orders.map(o => <option key={o.id} value={o.id} className="bg-card">{o.order_number} - {o.title}</option>)}
                                        </select>
                                    </div>

                                    {/* Valor */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                            <DollarSign className="w-3 h-3 text-emerald-400/40" />
                                            Valor (R$) *
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={form.amount}
                                            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                                            className="w-full bg-muted/30 border border-white/5 rounded-2xl px-5 py-6 text-2xl font-black text-foreground placeholder:text-muted-foreground/10 focus:outline-none focus:border-emerald-500/40 transition-all font-mono"
                                            placeholder="0,00"
                                        />
                                    </div>

                                    {/* Método */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                            <CreditCard className="w-3 h-3 text-primary/40" />
                                            Forma de Pagamento
                                        </label>
                                        <select
                                            value={form.payment_method}
                                            onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                                            className="w-full bg-muted/30 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-foreground focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer"
                                        >
                                            {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-card">{l}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Status */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Status</label>
                                        <div className="flex gap-2">
                                            {['completed', 'pending', 'partial'].map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setForm(p => ({ ...p, payment_status: s }))}
                                                    className={cn(
                                                        "flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                                        form.payment_status === s
                                                            ? "bg-primary/20 border-primary/50 text-white shadow-lg shadow-primary/10"
                                                            : "bg-muted/10 border-white/5 text-muted-foreground/40 hover:border-white/20"
                                                    )}
                                                >
                                                    {s === 'completed' ? 'Pago' : s === 'pending' ? 'Pendente' : 'Parcial'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Observações */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                            <Notebook className="w-3 h-3 text-primary/40" />
                                            Observações
                                        </label>
                                        <input
                                            type="text"
                                            value={form.notes}
                                            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                            className="w-full bg-muted/30 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-foreground placeholder:text-muted-foreground/10 focus:outline-none focus:border-primary/40 transition-all"
                                            placeholder="Referência, parcela..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="h-16 px-10 rounded-[2rem] border border-white/5 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-white/5 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="flex-1 h-16 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                <DollarSign className="w-4 h-4" />
                                                Registrar Recebimento
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
