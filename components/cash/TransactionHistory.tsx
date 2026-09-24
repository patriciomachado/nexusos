'use client'

import { useState, useMemo } from 'react'
import { 
    Search, Filter, ArrowUpRight, ArrowDownLeft, 
    Calendar, Receipt, MoreHorizontal, Wallet,
    TrendingUp, TrendingDown, Clock, History,
    DollarSign, Activity, PieChart, Info, ShieldCheck,
    Trash2, AlertTriangle
} from 'lucide-react'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TransactionHistoryProps {
    companyId: string
    initialPayments?: any[]
    allTransactions?: any[]
    registers?: any[]
}

export default function TransactionHistory({ 
    companyId, 
    initialPayments = [], 
    allTransactions = [],
    registers = []
}: TransactionHistoryProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit'>('all')
    const today = new Date()
    const defaultRange = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const [timeRange, setTimeRange] = useState<string>(defaultRange)
    const [showMonthPicker, setShowMonthPicker] = useState(false)
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; transaction: any | null }>({ open: false, transaction: null })
    const [deleting, setDeleting] = useState(false)

    const handleDeleteTransaction = async () => {
        if (!deleteModal.transaction || deleting) return
        
        setDeleting(true)
        try {
            const txId = deleteModal.transaction.originalData?.id
            if (!txId) {
                toast.error('ID da transação não encontrado')
                return
            }
            
            const response = await fetch(`/api/cash-transactions?id=${txId}`, {
                method: 'DELETE'
            })
            
            const data = await response.json()
            
            if (response.ok) {
                toast.success('Movimentação removida com sucesso')
                setDeleteModal({ open: false, transaction: null })
                window.location.reload()
            } else {
                toast.error(data.error || 'Erro ao remover transação')
            }
        } catch (error) {
            console.error('Error deleting transaction:', error)
            toast.error('Erro ao remover transação')
        } finally {
            setDeleting(false)
        }
    }

    // Unified History Logic
    const unifiedHistory = useMemo(() => {
        // Map cash transactions (The Source of Truth for the drawer)
        const cashHistory = allTransactions.map(tx => {
            let category = tx.type === 'entry' ? 'Entrada Manual' : 'Saída/Despesa'
            let description = tx.description || (tx.type === 'entry' ? 'Reforço de Caixa' : 'Retirada de Caixa')

            if (tx.source_type === 'product_sale') {
                category = 'Venda PDV'
            } else if (tx.source_type === 'service_order') {
                category = 'Serviço (OS)'
            } else if (tx.source_type === 'manual_sangria') {
                category = 'Sangria de Caixa'
            } else if (tx.source_type === 'manual_suprimento') {
                category = 'Suprimento de Caixa'
            }

            return {
                id: `tx-${tx.id}`,
                description,
                amount: Number(tx.amount),
                type: tx.type as 'entry' | 'exit',
                date: tx.created_at,
                method: tx.payment_methods?.name || 'Dinheiro',
                category,
                sourceId: tx.source_id,
                sourceType: tx.source_type,
                originalData: tx
            }
        })

        // Map payments (Global Revenue) - Filter out ones already in cash transactions to avoid duplication
        // We match by source_id AND amount to avoid filtering out legitimate split payments
        const paymentHistory = initialPayments
            .filter(p => {
                const sourceId = p.reference_id || p.service_order_id || p.sale_id || p.id;
                return !allTransactions.some(tx => {
                    // Match by source_id and amount
                    if (tx.source_id === sourceId && Number(tx.amount) === Number(p.amount)) {
                        return true;
                    }
                    // Fallback for older payments that don't have source_id linked properly
                    // Compare DB timestamps (created_at) which are reliable. 
                    // If created within 5 seconds with same amount, they are the same transaction
                    const timeDiff = Math.abs(new Date(tx.created_at).getTime() - new Date(p.created_at).getTime());
                    if (Number(tx.amount) === Number(p.amount) && timeDiff < 5000) {
                        return true;
                    }
                    return false;
                });
            })
            .map(p => ({
                id: `pay-${p.id}`,
                description: `Pagamento: ${p.customers?.name || 'Cliente'} ${p.service_orders?.order_number ? `(OS #${p.service_orders.order_number})` : ''}`,
                amount: Number(p.amount),
                type: 'entry' as const,
                date: p.payment_date || p.created_at,
                method: p.payment_method || 'PIX/Cartão',
                category: 'Faturamento Externo',
                sourceType: 'payment',
                sourceId: p.reference_id || p.service_order_id || p.id,
                originalData: p
            }))

        return [...cashHistory, ...paymentHistory].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    }, [initialPayments, allTransactions])

    const dateFilteredHistory = useMemo(() => {
        const now = new Date()
        return unifiedHistory.filter(item => {
            const itemDate = new Date(item.date)
            
            if (timeRange === 'all') return true

            if (timeRange === '30' || timeRange === '60' || timeRange === '90') {
                const days = parseInt(timeRange)
                const cutoff = new Date()
                cutoff.setDate(now.getDate() - days)
                return itemDate >= cutoff
            } else if (timeRange.includes('-')) {
                const [year, month] = timeRange.split('-').map(Number)
                return itemDate.getFullYear() === year && itemDate.getMonth() === month - 1
            }
            return true
        })
    }, [unifiedHistory, timeRange])

    const filteredHistory = useMemo(() => {
        return dateFilteredHistory.filter(item => {
            const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                item.category.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesType = filterType === 'all' || item.type === filterType
            return matchesSearch && matchesType
        })
    }, [dateFilteredHistory, searchQuery, filterType])

    // Calculate Metrics for the current view
    const metrics = useMemo(() => {
        // 1. Gross Revenue (Only OS and Sales)
        const grossRevenue = dateFilteredHistory
            .filter(item => 
                item.type === 'entry' && 
                (item.sourceType === 'service_order' || item.sourceType === 'product_sale' || item.sourceType === 'payment')
            )
            .reduce((sum, item) => sum + item.amount, 0)
        
        // 2. Other Entries (Manual Suprimentos)
        const otherEntries = dateFilteredHistory
            .filter(item => item.type === 'entry' && item.sourceType === 'manual_suprimento')
            .reduce((sum, item) => sum + item.amount, 0)

        // 3. Total Expenses (Sangrias and Exits)
        const totalExpenses = dateFilteredHistory
            .filter(item => item.type === 'exit' && !item.description.startsWith('Custo de Peças OS'))
            .reduce((sum, item) => sum + item.amount, 0)

        // 4. Total Cost of Goods (Parts Cost)
        const processedSourceIds = new Set<string>()
        const totalCost = dateFilteredHistory.reduce((sum, item) => {
            const data = item.originalData
            if (!data || item.type !== 'entry') return sum

            const sourceId = item.sourceId
            if (sourceId) {
                if (processedSourceIds.has(sourceId)) {
                    return sum // Skip if we already added the cost for this OS/Sale
                }
                processedSourceIds.add(sourceId)
            }

            let cost = 0

            // Check enriched data from API
            if (data.service_orders) {
                cost = Number(data.service_orders.parts_cost || 0)
            } else if (data.sales) {
                cost = Number(data.sales.total_cost || 0)
            } 
            // Fallback for direct fields if not enriched or older data
            else if (data.parts_cost) {
                cost = Number(data.parts_cost)
            } else if (data.total_cost) {
                cost = Number(data.total_cost)
            }

            return sum + cost
        }, 0)

        const grossProfit = grossRevenue - totalCost
        // Net Profit = Gross Profit - Expenses (Other entries like Suprimento don't count as profit, just cash balance)
        const netProfit = grossProfit - totalExpenses

        // 5. Calculate previous month balance (Líquido: Faturamento + Suprimento - Despesas/Sangrias)
        const prevMonthDate = new Date()
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
        const pmYear = prevMonthDate.getFullYear()
        const pmMonth = prevMonthDate.getMonth() // 0-indexed

        const prevMonthTransactions = unifiedHistory.filter(item => {
            const itemDate = new Date(item.date)
            return itemDate.getFullYear() === pmYear && itemDate.getMonth() === pmMonth
        })

        const pmGrossRevenue = prevMonthTransactions
            .filter(item => 
                item.type === 'entry' && 
                (item.sourceType === 'service_order' || item.sourceType === 'product_sale' || item.sourceType === 'payment')
            )
            .reduce((sum, item) => sum + item.amount, 0)
        
        const pmOtherEntries = prevMonthTransactions
            .filter(item => item.type === 'entry' && item.sourceType === 'manual_suprimento')
            .reduce((sum, item) => sum + item.amount, 0)

        const pmTotalExpenses = prevMonthTransactions
            .filter(item => item.type === 'exit' && !item.description.startsWith('Custo de Peças OS'))
            .reduce((sum, item) => sum + item.amount, 0)

        const pmNetCashFlow = pmGrossRevenue + pmOtherEntries - pmTotalExpenses

        return {
            totalRevenue: grossRevenue, // We display Gross Revenue as the main "Faturamento"
            otherEntries,
            totalExpenses,
            grossProfit,
            netProfit,
            margin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
            prevMonthNetCashFlow: pmNetCashFlow
        }
    }, [dateFilteredHistory, unifiedHistory])

    const availableMonths = useMemo(() => {
        const months = []
        const now = new Date()
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            months.push({ label, value })
        }
        return months
    }, [])

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Profit Snapshot Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="glass-premium rounded-3xl p-6 border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500/60">Caixa Mês Anterior</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-500 tracking-tighter">{formatCurrency(metrics.prevMonthNetCashFlow)}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Fluxo Líquido Caixa</span>
                    </div>
                </div>

                <div className="glass-premium rounded-3xl p-6 border border-border/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Faturamento do Período</span>
                    </div>
                    <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(metrics.totalRevenue)}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Entradas Processadas</span>
                    </div>
                </div>

                <div className="glass-premium rounded-3xl p-6 border border-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-500/60">Lucro Bruto Período</span>
                    </div>
                    <p className="text-2xl font-black text-indigo-500 tracking-tighter">{formatCurrency(metrics.grossProfit)}</p>
                    <p className="text-[11px] text-muted-foreground mt-2 uppercase font-bold tracking-tight">Receita - Custo de Peças</p>
                </div>

                <div className="glass-premium rounded-3xl p-6 border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500/60">Lucro Líquido Período</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-500 tracking-tighter">{formatCurrency(metrics.netProfit)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                            {metrics.margin.toFixed(1)}% MARGEM
                        </span>
                    </div>
                </div>

                <div className="glass-premium rounded-3xl p-6 border border-rose-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-rose-500/60">Despesas do Período</span>
                    </div>
                    <p className="text-2xl font-black text-rose-500 tracking-tighter">{formatCurrency(metrics.totalExpenses)}</p>
                    <p className="text-[11px] text-muted-foreground mt-2 uppercase font-bold tracking-tight">Retiradas e Exclusões</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/10">
                <div>
                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Histórico Unificado
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">
                        Visualização completa de fluxos financeiros
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Time Range Filter - Calendário/Meses Dinâmicos */}
                    <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-2xl border border-border/50">
                        {availableMonths.slice(0, 3).map((monthOption) => (
                            <button
                                key={monthOption.value}
                                onClick={() => setTimeRange(monthOption.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                    timeRange === monthOption.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {monthOption.label.split(' de ')[0]}
                            </button>
                        ))}
                        
                        <div className="relative">
                            <button
                                onClick={() => setShowMonthPicker(!showMonthPicker)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    timeRange.includes('-') ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Calendar className="w-3 h-3" />
                                {timeRange.includes('-') 
                                    ? availableMonths.find(m => m.value === timeRange)?.label 
                                    : "Outro Mês"}
                            </button>

                            {showMonthPicker && (
                                <div className="absolute top-full right-0 mt-2 w-48 glass-premium border border-border/50 rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {availableMonths.map((m) => (
                                            <button
                                                key={m.value}
                                                onClick={() => {
                                                    setTimeRange(m.value)
                                                    setShowMonthPicker(false)
                                                }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-colors",
                                                    timeRange === m.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                )}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                        <div className="border-t border-border/10 my-1" />
                                        <button
                                            onClick={() => {
                                                setTimeRange('all')
                                                setShowMonthPicker(false)
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-colors",
                                                timeRange === 'all' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            )}
                                        >
                                            Ver Tudo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-px h-6 bg-border/20 hidden sm:block" />

                    {/* Type Filter */}
                    <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-2xl border border-border/50">
                        <button
                            onClick={() => setFilterType('all')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                filterType === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterType('entry')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                filterType === 'entry' ? "bg-emerald-500/10 text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-emerald-500"
                            )}
                        >
                            Entradas
                        </button>
                        <button
                            onClick={() => setFilterType('exit')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                filterType === 'exit' ? "bg-rose-500/10 text-rose-500 shadow-sm" : "text-muted-foreground hover:text-rose-500"
                            )}
                        >
                            Saídas
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                    type="text"
                    placeholder="Buscar por descrição, cliente ou categoria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-card border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                />
            </div>

            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border/10 bg-muted/10">
                                <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground uppercase tracking-widest">Movimentação</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground uppercase tracking-widest">Categoria</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-muted-foreground uppercase tracking-widest">Data/Hora</th>
                                <th className="px-6 py-5 text-right text-[11px] font-black text-muted-foreground uppercase tracking-widest">Valor</th>
                                <th className="px-6 py-5 text-center text-[11px] font-black text-muted-foreground uppercase tracking-widest"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                            {filteredHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-muted/5 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner",
                                                item.type === 'entry' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                            )}>
                                                {item.type === 'entry' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{item.description}</p>
                                                <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{item.method}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", item.type === 'entry' ? "bg-emerald-500" : "bg-rose-500")} />
                                            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">
                                                {item.category}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-foreground">{formatDateTime(item.date).split(',')[0]}</span>
                                            <span className="text-[11px] text-muted-foreground font-black uppercase tracking-widest opacity-40">{formatDateTime(item.date).split(',')[1]}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className={cn(
                                            "text-base font-black tracking-tighter",
                                            item.type === 'entry' ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {item.type === 'entry' ? '+' : '-'} {formatCurrency(item.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <button 
                                            onClick={() => setDeleteModal({ open: true, transaction: item })} 
                                            className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                                            title="Excluir movimentação"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground border border-border/20 border-dashed">
                            <History className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg text-foreground/40">Nenhuma transação encontrada</h3>
                            <p className="text-sm text-muted-foreground italic">O histórico unificado está vazio ou não corresponde aos filtros.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Histórico de Fechamentos (Registers) */}
            {registers && registers.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                Histórico de Fechamentos (Expedientes)
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest opacity-60">
                                Conferência de saldos e encerramentos anteriores
                            </p>
                        </div>
                    </div>

                    <div className="glass-premium rounded-3xl border border-border/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/10 bg-muted/20">
                                        <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Data/Hora</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Operador</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Abertura</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-right">Fechamento Esperado</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-right">Real Informado</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                                        <th className="px-4 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-center">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/5">
                                    {registers.slice(0, 10).map((reg) => (
                                        <tr key={reg.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-foreground">{formatDateTime(reg.opened_at).split(',')[0]}</span>
                                                    <span className="text-[11px] text-muted-foreground font-black uppercase tracking-widest opacity-40">
                                                        {new Date(reg.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-foreground/80">{reg.users?.name || 'Sistema'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-muted-foreground">{formatCurrency(reg.opening_balance)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-xs font-bold text-foreground">{formatCurrency(reg.closing_balance || 0)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-xs font-black text-primary">{formatCurrency(reg.actual_balance || reg.closing_balance || 0)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <span className={cn(
                                                        "text-[11px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border",
                                                        reg.status === 'open' 
                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                            : "bg-muted text-muted-foreground border-border/20"
                                                    )}>
                                                        {reg.status === 'open' ? 'Aberto' : 'Encerrado'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-center">
                                                    {reg.status !== 'open' && (
                                                        <button
                                                            onClick={() => setDeleteModal({ open: true, transaction: { originalData: { id: reg.id, description: `Fechamento ${formatDateTime(reg.opened_at).split(',')[0]}`, amount: reg.closing_balance || 0 } } })}
                                                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                                            title="Excluir fechamento"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Legend/Info */}
            <div className="p-6 glass-premium rounded-3xl border border-border/30 flex items-start gap-4">
                <div className="p-2 rounded-xl bg-primary/10 text-primary mt-1">
                    <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-foreground/80">Sobre os Cálculos</p>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                        O <strong className="text-indigo-500 uppercase tracking-widest">Lucro Bruto</strong> é calculado subtraindo o custo de peças e produtos do faturamento total. 
                        O <strong className="text-emerald-500 uppercase tracking-widest">Lucro Líquido</strong> subtrai também as despesas operacionais (saídas de caixa). 
                        Transações manuais de entrada são contabilizadas no faturamento, enquanto saídas são despesas.
                    </p>
                </div>
            </div>

            {/* Delete Transaction Modal */}
            {deleteModal.open && deleteModal.transaction && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 rounded-2xl bg-destructive/10 text-destructive">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground">Excluir Movimentação?</h3>
                                <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Tem certeza que deseja excluir a movimentação <strong className="text-foreground">{deleteModal.transaction.originalData?.description}</strong> de <strong className="text-foreground">{formatCurrency(deleteModal.transaction.originalData?.amount)}</strong>?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal({ open: false, transaction: null })}
                                className="flex-1 py-3 rounded-xl bg-muted/50 text-sm font-bold text-foreground hover:bg-muted transition-all"
                                disabled={deleting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteTransaction}
                                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <span className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Excluir
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
