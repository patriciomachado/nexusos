'use client'

import { useState, useEffect } from 'react'
import { 
    X, Plus, Trash2, Calendar, DollarSign, 
    CreditCard, Tag, AlertCircle, Save, Loader2 
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface RecurringExpense {
    id: string
    description: string
    amount: number
    day_of_month: number
    category: string
    payment_method_id: string | null
    active: boolean
}

interface PaymentMethod {
    id: string
    name: string
}

interface RecurringExpensesModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function RecurringExpensesModal({ isOpen, onClose }: RecurringExpensesModalProps) {
    const [expenses, setExpenses] = useState<RecurringExpense[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    
    // Form state
    const [newExpense, setNewExpense] = useState({
        description: '',
        amount: '',
        day_of_month: '1',
        category: 'Despesas Fixas',
        payment_method_id: ''
    })

    useEffect(() => {
        if (isOpen) {
            fetchData()
        }
    }, [isOpen])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [expRes, pmRes] = await Promise.all([
                fetch('/api/recurring-expenses'),
                fetch('/api/payments')
            ])
            
            const expData = await expRes.json()
            const pmData = await pmRes.json()
            
            setExpenses(Array.isArray(expData) ? expData : (expData.data || []))
            setPaymentMethods(Array.isArray(pmData.data) ? pmData.data : [])
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Erro ao carregar despesas fixas')
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newExpense.description || !newExpense.amount) {
            toast.error('Preencha a descrição e o valor')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/recurring-expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newExpense,
                    amount: parseFloat(newExpense.amount),
                    day_of_month: parseInt(newExpense.day_of_month),
                    payment_method_id: newExpense.payment_method_id || null
                })
            })

            if (res.ok) {
                toast.success('Despesa fixa adicionada com sucesso')
                setNewExpense({
                    description: '',
                    amount: '',
                    day_of_month: '1',
                    category: 'Despesas Fixas',
                    payment_method_id: ''
                })
                setShowAddForm(false)
                fetchData()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Erro ao adicionar despesa')
            }
        } catch (error) {
            toast.error('Erro de conexão')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta despesa fixa?')) return

        try {
            const res = await fetch(`/api/recurring-expenses/${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Despesa removida')
                setExpenses(prev => prev.filter(e => e.id !== id))
            } else {
                toast.error('Erro ao remover despesa')
            }
        } catch (error) {
            toast.error('Erro de conexão')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border w-full max-w-2xl rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Contas Fixas</h2>
                            <p className="text-xs text-muted-foreground font-semibold">
                                Gestão de Despesas Recorrentes Mensais
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
                    {/* Intro */}
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex gap-4 items-start">
                        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-primary/80 leading-relaxed font-medium">
                            As contas cadastradas aqui serão lançadas automaticamente no caixa todo mês, no dia configurado. 
                            Isso ajuda a manter seu fluxo de caixa sempre atualizado com as obrigações fixas.
                        </p>
                    </div>

                    {/* Add Form Toggle */}
                    {!showAddForm ? (
                        <button 
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-3 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all group"
                        >
                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold">Cadastrar Nova Conta Fixa</span>
                        </button>
                    ) : (
                        <form onSubmit={handleAdd} className="p-6 bg-muted/40 border border-border rounded-2xl space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[13px] font-medium text-muted-foreground ml-1">Descrição</label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input 
                                            value={newExpense.description}
                                            onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                                            placeholder="Ex: Aluguel, Internet, Contador..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-muted-foreground ml-1">Valor Mensal</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input 
                                            type="number"
                                            step="0.01"
                                            value={newExpense.amount}
                                            onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                                            placeholder="0,00"
                                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-muted-foreground ml-1">Dia do Vencimento</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <select 
                                            value={newExpense.day_of_month}
                                            onChange={e => setNewExpense({...newExpense, day_of_month: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
                                        >
                                            {[...Array(31)].map((_, i) => (
                                                <option key={i+1} value={i+1}>Todo dia {i+1}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-muted-foreground ml-1">Método de Pagamento (Opcional)</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <select 
                                            value={newExpense.payment_method_id}
                                            onChange={e => setNewExpense({...newExpense, payment_method_id: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
                                        >
                                            <option value="">Selecione...</option>
                                            {paymentMethods.map(pm => (
                                                <option key={pm.id} value={pm.id}>{pm.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-muted-foreground ml-1">Categoria</label>
                                    <input 
                                        value={newExpense.category}
                                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 py-2.5 px-4 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
 type="submit"
 disabled={saving}
 className="flex-[2] py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
 >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar Despesa
                                </button>
                            </div>
                        </form>
                    )}

                    {/* List */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground px-1">Contas Cadastradas</h3>
                        
                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin opacity-20" />
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="py-12 text-center bg-muted/20 border border-dashed border-border rounded-2xl">
                                <p className="text-xs text-muted-foreground">Nenhuma despesa fixa encontrada.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {expenses.map(expense => (
                                    <div key={expense.id} className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{expense.description}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                    <span>Dia {expense.day_of_month}</span>
                                                    <span className="w-1 h-1 bg-border rounded-full" />
                                                    <span>{expense.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-rose-400">{formatCurrency(expense.amount)}</p>
                                                <p className="text-xs text-muted-foreground font-semibold">Mensal</p>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                    >
                        Concluído
                    </button>
                </div>
            </div>
        </div>
    )
}
