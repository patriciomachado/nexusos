'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Plus, Minus, ArrowUpRight, Wallet, History, Lock, Unlock,
    RefreshCw, Filter, ArrowDownLeft, Receipt, TrendingUp, PiggyBank,
    CreditCard, Calendar, DollarSign, Search, MoreHorizontal,
    ArrowUpCircle, ArrowDownCircle, ShieldCheck, Activity, BarChart3,
    ArrowRightLeft, Landmark, Zap, AlertCircle, TrendingDown,
    Clock, Users, ArrowRight, LayoutDashboard, FileText, Settings
} from 'lucide-react'
import { formatCurrency, formatDateTime, cn, PAYMENT_METHOD_LABELS, SOURCE_TYPE_LABELS, getLocalDateString } from '@/lib/utils'
import Header from '@/components/layout/Header'
import { CashRegister, CashTransaction } from '@/types'
import { toast } from 'sonner'
import OpenCashModal from '../../../components/financeiro/OpenCashModal'
import ManualTransactionModal from '../../../components/financeiro/ManualTransactionModal'
import CloseCashModal from '../../../components/financeiro/CloseCashModal'
import TransactionHistory from '@/components/cash/TransactionHistory'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import RecurringExpensesModal from '@/components/financeiro/RecurringExpensesModal'

export default function CashRegisterClient() {
    const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily')
    const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null)
    const [transactions, setTransactions] = useState<CashTransaction[]>([])
    const [allTransactions, setAllTransactions] = useState<CashTransaction[]>([])
    const [registers, setRegisters] = useState<CashRegister[]>([])
    const [payments, setPayments] = useState<any[]>([])
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false)
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false)
    const [transactionType, setTransactionType] = useState<'entry' | 'exit'>('entry')
    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch current register with cache: 'no-store' to ensure real-time data
            const regRes = await fetch('/api/cash-registers/current', { cache: 'no-store' })
            const regData = await regRes.json()

            if (regData && !regData.error && regData.id) {
                setCurrentRegister(regData)
                const transRes = await fetch(`/api/cash-transactions?cash_register_id=${regData.id}`, { cache: 'no-store' })
                const transResp = await transRes.json()
                const tData = Array.isArray(transResp) ? transResp : (transResp.data || [])
                setTransactions(tData)
            } else {
                setCurrentRegister(null)
                // If no register is open, fetch all transactions from today to show as "recent"
                const today = getLocalDateString()
                const transRes = await fetch(`/api/cash-transactions?date=${today}`, { cache: 'no-store' })
                const transResp = await transRes.json()
                const tData = Array.isArray(transResp) ? transResp : (transResp.data || [])
                setTransactions(tData)
            }

            const [paymentsRes, userRes, registersRes, allTransRes] = await Promise.all([
                fetch('/api/payments', { cache: 'no-store' }),
                fetch('/api/auth/me', { cache: 'no-store' }),
                fetch('/api/cash-registers', { cache: 'no-store' }),
                fetch('/api/cash-transactions', { cache: 'no-store' })
            ])

            const [paymentsData, userData, registersData, allTransData] = await Promise.all([
                paymentsRes.json(),
                userRes.json(),
                registersRes.json(),
                allTransRes.json()
            ])

            setPayments(Array.isArray(paymentsData.data) ? paymentsData.data : [])
            setCompanyId(userData?.company_id || null)
            setRegisters(Array.isArray(registersData.data) ? registersData.data : [])
            
            const allTx = Array.isArray(allTransData.data) ? allTransData.data : (Array.isArray(allTransData) ? allTransData : [])
            console.log(`Loaded ${allTx.length} total transactions`)
            setAllTransactions(allTx)
        } catch (error) {
            console.error('Error in fetchData:', error)
            toast.error('Erro ao carregar dados do caixa')
        } finally {
            setLoading(false)
        }
    }

     useEffect(() => {
        fetchData()
    }, [])


    const handleSuccess = () => {
        setTimeout(() => fetchData(), 500)
    }

    const calculateBalance = useMemo(() => {
        if (!currentRegister) return 0
        let balance = Number(currentRegister.opening_balance)
        transactions.forEach(tx => {
            if (tx.type === 'entry') balance += Number(tx.amount)
            else balance -= Number(tx.amount)
        })
        return balance
    }, [currentRegister, transactions])

    const stats = useMemo(() => {
        const entries = transactions.filter(t => t.type === 'entry').reduce((acc, t) => acc + Number(t.amount), 0)
        const exits = transactions.filter(t => t.type === 'exit').reduce((acc, t) => acc + Number(t.amount), 0)
        return { entries, exits }
    }, [transactions])

    const chartData = useMemo(() => {
        if (!currentRegister) return []
        let currentBalance = Number(currentRegister.opening_balance)
        const data = [{ time: 'Início', balance: currentBalance }]
        
        const sortedTrans = [...transactions].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        sortedTrans.forEach(tx => {
            if (tx.type === 'entry') currentBalance += Number(tx.amount)
            else currentBalance -= Number(tx.amount)
            data.push({
                time: new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                balance: currentBalance
            })
        })

        return data
    }, [currentRegister, transactions])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs font-medium text-muted-foreground animate-pulse">Sincronizando dados financeiros...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 lg:pb-12">
            <Header 
                title="Caixa Operacional" 
                subtitle="Gestão inteligente de fluxo de caixa e transações em tempo real." 
            />

            <main className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-8">
                {/* Dashboard Tabs & Global Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="inline-flex p-1 bg-muted/50 border border-border rounded-xl">
                        <button
                            onClick={() => setActiveTab('daily')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                                activeTab === 'daily' 
                                    ? "bg-primary text-primary-foreground shadow-lg" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Terminal Hoje
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                                activeTab === 'history' 
                                    ? "bg-primary text-primary-foreground shadow-lg" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <History className="w-4 h-4" />
                            Histórico de Fechamentos
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchData}
                            className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all active:scale-95"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        
                        {!currentRegister ? (
                            <button
                                onClick={() => setIsOpeningModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                            >
                                <Unlock className="w-4 h-4" />
                                Abrir Terminal
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsClosingModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                            >
                                <Lock className="w-4 h-4" />
                                Encerrar Caixa
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'daily' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN: Stats & Chart */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Main Balance Card */}
                            <div className="relative overflow-hidden bg-card/40 border border-border rounded-3xl p-8 group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />
                                
                                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                                            <Wallet className="w-3.5 h-3.5" />
                                            Saldo Disponível em Caixa
                                        </div>
                                        <h2 className="text-5xl font-black tracking-tighter tabular-nums">
                                            {formatCurrency(calculateBalance)}
                                        </h2>
                                        {currentRegister && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Aberto às {new Date(currentRegister.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="w-1 h-1 bg-border rounded-full" />
                                                <span>Abertura: {formatCurrency(currentRegister.opening_balance)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3 text-right">
                                            <span className="block text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Entradas</span>
                                            <span className="text-xl font-bold text-emerald-400 tabular-nums">{formatCurrency(stats.entries)}</span>
                                        </div>
                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-3 text-right">
                                            <span className="block text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1">Saídas</span>
                                            <span className="text-xl font-bold text-rose-400 tabular-nums">{formatCurrency(stats.exits)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Flow Chart */}
                                <div className="h-[220px] w-full mt-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                                            <XAxis 
                                                dataKey="time" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                                dy={10}
                                            />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: 'hsl(var(--card))', 
                                                    border: '1px solid hsl(var(--border))',
                                                    color: 'hsl(var(--card-foreground))',
                                                    borderRadius: '12px',
                                                    fontSize: '12px'
                                                }}
                                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="balance" 
                                                stroke="#3b82f6" 
                                                strokeWidth={3}
                                                fillOpacity={1} 
                                                fill="url(#colorFlow)" 
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Transaction List */}
                            <div className="bg-card/40 border border-border rounded-3xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                    <h3 className="text-sm font-bold flex items-center gap-2">
                                        <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                                        Últimas Movimentações
                                    </h3>
                                    <div className="px-2 py-1 bg-muted rounded text-[10px] font-bold text-muted-foreground">
                                        {transactions.length} registros
                                    </div>
                                </div>

                                <div className="divide-y divide-border max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {transactions.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
                                            <div className="p-4 bg-muted rounded-full border border-border">
                                                <Activity className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-xs font-medium uppercase tracking-widest opacity-40">Nenhuma transação registrada hoje</p>
                                        </div>
                                    ) : (
                                        transactions.map((tx, idx) => (
                                            <motion.div 
                                                key={tx.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <div className="group flex items-center justify-between p-4 hover:bg-muted/30 transition-all cursor-default">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                                                        tx.type === 'entry' 
                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                    )}>
                                                        {tx.type === 'entry' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{tx.description}</p>
                                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                                            <span className="flex items-center gap-1">
                                                                <CreditCard className="w-3 h-3" />
                                                                {tx.payment_method?.name || 'Automático'}
                                                            </span>
                                                            <span className="w-1 h-1 bg-border rounded-full" />
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-0.5">
                                                    <p className={cn(
                                                        "text-base font-bold tabular-nums",
                                                        tx.type === 'entry' ? "text-emerald-400" : "text-rose-400"
                                                    )}>
                                                        {tx.type === 'entry' ? '+' : '-'} {formatCurrency(tx.amount)}
                                                    </p>
                                                    <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">
                                                        {tx.source_type === 'manual_suprimento' ? 'Suprimento de Caixa' : 
                                                         tx.source_type === 'manual_sangria' ? 'Sangria de Caixa' :
                                                         SOURCE_TYPE_LABELS[tx.source_type as keyof typeof SOURCE_TYPE_LABELS] || tx.source_type}
                                                    </p>
                                                </div>
                                            </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Quick Actions & Insights */}
                        <div className="lg:col-span-4 space-y-8">
                            {/* Actions Card */}
                            <div className="bg-card/40 border border-border rounded-3xl p-6 space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-primary" />
                                    Ações Rápidas
                                </h3>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => { setTransactionType('entry'); setIsTransactionModalOpen(true); }}
                                        disabled={!currentRegister}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted border border-border hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                                                <Plus className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-foreground">Suprimento</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Entrada de dinheiro</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors" />
                                    </button>

                                    <button
                                        onClick={() => { setTransactionType('exit'); setIsTransactionModalOpen(true); }}
                                        disabled={!currentRegister}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted border border-border hover:border-rose-500/30 hover:bg-rose-500/5 transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                                                <Minus className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-foreground">Sangria</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Retirada de dinheiro</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-rose-500 transition-colors" />
                                    </button>

                                    <button
                                        onClick={() => setIsRecurringModalOpen(true)}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-foreground">Contas Fixas</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Gerenciar gastos mensais</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                    </button>
                                </div>
                            </div>

                                {!currentRegister && (
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                                        <div className="flex items-center gap-2 text-primary text-xs font-bold mb-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Terminal Offline
                                        </div>
                                        <p className="text-[11px] text-primary/70 font-medium leading-relaxed mb-4">
                                            Abra o caixa para começar a processar vendas e gerenciar movimentações financeiras.
                                        </p>
                                        <button 
                                            onClick={() => setIsOpeningModalOpen(true)}
                                            className="w-full py-2.5 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                                        >
                                            Ativar Agora
                                        </button>
                                    </div>
                                )}
                            
                            {/* Performance Insights */}
                            <div className="bg-card/40 border border-border rounded-3xl p-6 space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    Métricas de Hoje
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-muted/60 rounded-2xl border border-border">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-4 h-4 text-muted-foreground/60" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Operadores Ativos</span>
                                        </div>
                                        <span className="text-lg font-black text-foreground">
                                            {new Set(transactions.map(t => t.user_id)).size || 0}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-muted/60 rounded-2xl border border-border">
                                        <div className="flex items-center gap-3">
                                            <Receipt className="w-4 h-4 text-muted-foreground/60" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Ticket Médio</span>
                                        </div>
                                        <span className="text-lg font-black text-foreground">
                                            {formatCurrency(transactions.length > 0 ? (stats.entries / transactions.length) : 0)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-muted/60 rounded-2xl border border-border">
                                        <div className="flex items-center gap-3">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Vendas OS e PDV</span>
                                        </div>
                                        <span className="text-lg font-black text-foreground">
                                            {transactions.filter(t => t.source_type === 'service_order' || t.source_type === 'product_sale').length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="bg-card/40 rounded-3xl border border-border p-2 overflow-hidden backdrop-blur-xl">
                            <TransactionHistory 
                                companyId={companyId || ''} 
                                initialPayments={payments}
                                allTransactions={allTransactions}
                                registers={registers}
                            />
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Modals */}
            <AnimatePresence>
                {isOpeningModalOpen && (
                    <OpenCashModal
                        isOpen={isOpeningModalOpen}
                        onClose={() => setIsOpeningModalOpen(false)}
                        onSuccess={handleSuccess}
                    />
                )}
                {currentRegister && isTransactionModalOpen && (
                    <ManualTransactionModal
                        isOpen={isTransactionModalOpen}
                        onClose={() => setIsTransactionModalOpen(false)}
                        onSuccess={handleSuccess}
                        type={transactionType}
                        cashRegisterId={currentRegister.id}
                        title={transactionType === 'entry' ? 'Suprimento de Caixa' : 'Sangria de Caixa'}
                    />
                )}
                {currentRegister && isClosingModalOpen && (
                    <CloseCashModal
                        isOpen={isClosingModalOpen}
                        onClose={() => setIsClosingModalOpen(false)}
                        onSuccess={handleSuccess}
                        cashRegister={currentRegister}
                        balance={calculateBalance}
                    />
                )}
                {isRecurringModalOpen && (
                    <RecurringExpensesModal
                        isOpen={isRecurringModalOpen}
                        onClose={() => setIsRecurringModalOpen(false)}
                    />
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--muted-foreground);
                    opacity: 0.5;
                }
            `}</style>
        </div>
    )
}
