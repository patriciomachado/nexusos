'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PAYMENT_METHOD_LABELS } from '@/lib/utils'

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
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
                <Plus className="w-4 h-4" />
                Registrar Pagamento
            </button>

            {open && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setOpen(false)}>
                    <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="font-semibold text-foreground text-lg mb-5">Registrar Pagamento</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Cliente</label>
                                <select value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary">
                                    <option value="">Selecionar cliente...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Ordem de Serviço</label>
                                <select value={form.service_order_id} onChange={e => setForm(p => ({ ...p, service_order_id: e.target.value }))} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary">
                                    <option value="">Sem OS vinculada</option>
                                    {orders.map(o => <option key={o.id} value={o.id} >{o.order_number} - {o.title}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Valor (R$) *</label>
                                    <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary" placeholder="0,00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Forma de Pagamento</label>
                                    <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary">
                                        {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Status</label>
                                <select value={form.payment_status} onChange={e => setForm(p => ({ ...p, payment_status: e.target.value }))} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary">
                                    <option value="completed">Pago</option>
                                    <option value="pending">Pendente</option>
                                    <option value="partial">Parcial</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Observações</label>
                                <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary" placeholder="Referência, parcela..." />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
                                    {isPending ? 'Registrando...' : 'Registrar'}
                                </button>
                                <button type="button" onClick={() => setOpen(false)} className="px-6 py-2.5 rounded-lg border border-border text-foreground/70 hover:bg-muted text-sm transition-all">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
