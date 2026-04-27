'use client'

import { useState, useMemo } from 'react'
import { 
    Search, Filter, ArrowUpRight, ArrowDownLeft, 
    Calendar, Receipt, MoreHorizontal, Wallet,
    TrendingUp, TrendingDown, Clock, History,
    DollarSign, Activity, PieChart, Info
} from 'lucide-react'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'

interface TransactionHistoryProps {
    companyId: string
    initialPayments?: any[]
    allTransactions?: any[]
}

export default function TransactionHistory({ 
    companyId, 
    initialPayments = [], 
    allTransactions = [] 
}: TransactionHistoryProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit'>('all')

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
        const paymentHistory = initialPayments
            .filter(p => !allTransactions.some(tx => tx.source_id === (p.reference_id || p.service_order_id || p.id)))
            .map(p => ({
                id: `pay-${p.id}`,
                description: `Pagamento: ${p.customers?.name || 'Cliente'} ${p.service_orders?.order_number ? `(OS #${p.service_orders.order_number})` : ''}`,
                amount: Number(p.amount),
                type: 'entry' as const,
                date: p.payment_date || p.created_at,
                method: p.payment_method,
                category: 'Faturamento Externo',
                originalData: p
            }))

        return [...cashHistory, ...paymentHistory].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    }, [initialPayments, allTransactions])

    const filteredHistory = useMemo(() => {
        return unifiedHistory.filter(item => {
            const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                item.category.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesType = filterType === 'all' || item.type === filterType
            return matchesSearch && matchesType
        })
    }, [unifiedHistory, searchQuery, filterType])

    // Calculate Metrics for the current view
    const metrics = useMemo(() => {
        const totalRevenue = unifiedHistory
            .filter(item => item.type === 'entry')
            .reduce((sum, item) => sum + item.amount, 0)
        
        const totalExpenses = unifiedHistory
            .filter(item => item.type === 'exit')
            .reduce((sum, item) => sum + item.amount, 0)

        // Calculate Gross Profit
        // Gross Profit = Revenue - Cost of Goods/Parts
        // We look into originalData for parts_cost or product cost if available
        const totalCost = initialPayments.reduce((sum, p) => {
            const partsCost = Number(p.service_orders?.parts_cost || 0)
            // If it's a sale, we might have product costs in the future
            return sum + partsCost
        }, 0)

        const grossProfit = totalRevenue - totalCost
        const netProfit = grossProfit - totalExpenses

        return {
            totalRevenue,
            totalExpenses,
            grossProfit,
            netProfit,
            margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
        }
    }, [unifiedHistory, initialPayments])

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Profit Snapshot Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-premium rounded-[2rem] p-6 border border-border/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Faturamento Total</span>
                    </div>
                    <p className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(metrics.totalRevenue)}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Entradas Processadas</span>
                    </div>
                </div>

                <div className="glass-premium rounded-[2rem] p-6 border border-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60">Lucro Bruto</span>
                    </div>
                    <p className="text-2xl font-black text-indigo-500 tracking-tighter">{formatCurrency(metrics.grossProfit)}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-2 uppercase font-bold tracking-tight">Receita - Custo de Peças</p>
                </div>

                <div className="glass-premium rounded-[2rem] p-6 border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Lucro Líquido</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-500 tracking-tighter">{formatCurrency(metrics.netProfit)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                            {metrics.margin.toFixed(1)}% MARGEM
                        </span>
                    </div>
                </div>

                <div className="glass-premium rounded-[2rem] p-6 border border-rose-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/60">Despesas Totais</span>
                    </div>
                    <p className="text-2xl font-black text-rose-500 tracking-tighter">{formatCurrency(metrics.totalExpenses)}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-2 uppercase font-bold tracking-tight">Retiradas e Exclusões</p>
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

                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-2xl border border-border/50">
                    <button
                        onClick={() => setFilterType('all')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            filterType === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterType('entry')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            filterType === 'entry' ? "bg-emerald-500/10 text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-emerald-500"
                        )}
                    >
                        Entradas
                    </button>
                    <button
                        onClick={() => setFilterType('exit')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            filterType === 'exit' ? "bg-rose-500/10 text-rose-500 shadow-sm" : "text-muted-foreground hover:text-rose-500"
                        )}
                    >
                        Saídas
                    </button>
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

            <div className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border/10 bg-muted/10">
                                <th className="px-6 py-5 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Movimentação</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Categoria</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Data/Hora</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest"></th>
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
                                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{item.method}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", item.type === 'entry' ? "bg-emerald-500" : "bg-rose-500")} />
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-80">
                                                {item.category}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-foreground">{formatDateTime(item.date).split(',')[0]}</span>
                                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">{formatDateTime(item.date).split(',')[1]}</span>
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
                                        <button className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/30 border border-border/20 border-dashed">
                            <History className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg text-foreground/40">Nenhuma transação encontrada</h3>
                            <p className="text-sm text-muted-foreground/40 italic">O histórico unificado está vazio ou não corresponde aos filtros.</p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Legend/Info */}
            <div className="p-6 glass-premium rounded-[2rem] border border-border/30 flex items-start gap-4">
                <div className="p-2 rounded-xl bg-primary/10 text-primary mt-1">
                    <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-foreground/80">Sobre os Cálculos</p>
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                        O <strong className="text-indigo-500 uppercase tracking-widest">Lucro Bruto</strong> é calculado subtraindo o custo de peças e produtos do faturamento total. 
                        O <strong className="text-emerald-500 uppercase tracking-widest">Lucro Líquido</strong> subtrai também as despesas operacionais (saídas de caixa). 
                        Transações manuais de entrada são contabilizadas no faturamento, enquanto saídas são despesas.
                    </p>
                </div>
            </div>
        </div>
    )
}
