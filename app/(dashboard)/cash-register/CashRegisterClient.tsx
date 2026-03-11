'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Plus, Minus, ArrowUpRight, Wallet, History, Lock, Unlock,
    RefreshCw, Filter, ArrowDownLeft, Receipt, TrendingUp, PiggyBank,
    CreditCard, Calendar, DollarSign, Search, MoreHorizontal
} from 'lucide-react'
import { formatCurrency, formatDateTime, cn, PAYMENT_METHOD_LABELS } from '@/lib/utils'
import Header from '@/components/layout/Header'
import { CashRegister, CashTransaction } from '@/types'
import { toast } from 'sonner'
import OpenCashModal from '../../../components/financeiro/OpenCashModal'
import ManualTransactionModal from '../../../components/financeiro/ManualTransactionModal'
import CloseCashModal from '../../../components/financeiro/CloseCashModal'
import RegisterPaymentButton from '@/components/payments/RegisterPaymentButton'
import SearchInput from '@/components/ui/SearchInput'

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, border: string }> = {
    completed: { label: 'Pago', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    pending: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    failed: { label: 'Falhou', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    refunded: { label: 'Reembolsado', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    partial: { label: 'Parcial', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
}

export default function CashRegisterClient() {
    const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily')
    const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null)
    const [transactions, setTransactions] = useState<CashTransaction[]>([])
    const [payments, setPayments] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [orders, setOrders] = useState<any[]>([])
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false)
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false)
    const [transactionType, setTransactionType] = useState<'entry' | 'exit'>('entry')
    const [searchQuery, setSearchQuery] = useState('')

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch register and current day transactions
            const regRes = await fetch('/api/cash-registers/current')
            const regData = await regRes.json()

            if (regData && !regData.error) {
                setCurrentRegister(regData)
                const transRes = await fetch(`/api/cash-transactions?cash_register_id=${regData.id}`)
                const transData = await transRes.json()
                setTransactions(Array.isArray(transData) ? transData : [])
            } else {
                setCurrentRegister(null)
                setTransactions([])
            }

            // Fetch general financial data
            const [paymentsRes, customersRes, ordersRes, userRes] = await Promise.all([
                fetch('/api/payments'), // We might need to update this API to return all or filter
                fetch('/api/customers'),
                fetch('/api/service-orders'),
                fetch('/api/auth/me') // Assuming we have this to get company_id
            ])

            const [paymentsData, customersData, ordersData, userData] = await Promise.all([
                paymentsRes.json(),
                customersRes.json(),
                ordersRes.json(),
                userRes.json()
            ])

            setPayments(Array.isArray(paymentsData) ? paymentsData : [])
            setCustomers(Array.isArray(customersData) ? customersData : [])
            setOrders(Array.isArray(ordersData) ? ordersData : [])
            setCompanyId(userData?.company_id || null)

        } catch (error) {
            console.error('Error fetching cash data:', error)
            toast.error('Erro ao carregar dados financeiros.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const transactionsList = useMemo(() => Array.isArray(transactions) ? transactions : [], [transactions])

    const calculateBalance = useMemo(() => {
        if (!currentRegister) return 0
        let balance = Number(currentRegister.opening_balance)
        transactionsList.forEach(tx => {
            if (tx.type === 'entry') balance += Number(tx.amount)
            else balance -= Number(tx.amount)
        })
        return balance
    }, [currentRegister, transactionsList])

    const filteredPayments = useMemo(() => {
        let list = payments
        if (searchQuery) {
            const s = searchQuery.toLowerCase()
            list = list.filter((p: any) =>
                p.customers?.name?.toLowerCase().includes(s) ||
                p.service_orders?.order_number?.toLowerCase().includes(s) ||
                p.service_orders?.title?.toLowerCase().includes(s)
            )
        }
        return list
    }, [payments, searchQuery])

    const totalReceived = useMemo(() => payments.filter((p: any) => p.payment_status === 'completed').reduce((s: number, p: any) => s + p.amount, 0) || 0, [payments])
    const totalPending = useMemo(() => payments.filter((p: any) => p.payment_status === 'pending').reduce((s: number, p: any) => s + p.amount, 0) || 0, [payments])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background transition-colors duration-500">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-3xl border-2 border-primary/20 animate-pulse" />
                        <RefreshCw className="w-8 h-8 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Sincronizando Hub Financeiro</span>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Gestão Financeira & Caixa" subtitle="Controle total de entradas diárias e histórico de pagamentos." />

            <div className="p-8 lg:p-12 max-w-screen-2xl mx-auto space-y-12">

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 p-1.5 bg-muted/30 border border-white/5 rounded-3xl w-fit backdrop-blur-3xl mx-auto lg:mx-0">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={cn(
                            "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            activeTab === 'daily'
                                ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105"
                                : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <Wallet className="w-3.5 h-3.5" />
                        Fluxo do Dia
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            activeTab === 'history'
                                ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105"
                                : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <History className="w-3.5 h-3.5" />
                        Histórico Geral
                    </button>
                </div>

                {activeTab === 'daily' ? (
                    <>
                        {/* Daily Flow Header */}
                        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-1 bg-primary rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Operações Diárias</span>
                                </div>
                                <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter">Fluxo de Caixa</h2>
                                <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-xl">Monitoramento em tempo real das movimentações financeiras do PDV.</p>
                            </div>
                        </div>

                        {!currentRegister ? (
                            <div className="flex flex-col items-center justify-center p-24 bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-2xl text-center space-y-10">
                                <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20 group hover:rotate-12 transition-transform">
                                    <Lock className="w-10 h-10 text-primary/40" />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black tracking-tighter text-foreground">Caixa Fechado</h2>
                                    <p className="text-muted-foreground/60 max-w-sm mx-auto text-lg">Inicie sua jornada financeira hoje abrindo o caixa para registro de vendas e retiradas.</p>
                                </div>
                                <button
                                    onClick={() => setIsOpeningModalOpen(true)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                                >
                                    <Unlock className="w-5 h-5" />
                                    Abrir Caixa Agora
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Main Balance Card */}
                                    <div className="lg:col-span-8 p-10 lg:p-12 rounded-[3.5rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-white/5 relative overflow-hidden group shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] min-h-[400px] flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
                                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4 mb-12">
                                                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40">
                                                    <Wallet className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Disponível em Espécie</span>
                                                    <p className="text-[10px] text-muted-foreground/60 font-mono font-black mt-1">Sessão iniciada às {formatDateTime(currentRegister.opened_at).split(',')[1]}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-7xl lg:text-8xl font-black text-foreground tracking-tighter tabular-nums drop-shadow-2xl">
                                                    {formatCurrency(calculateBalance)}
                                                </h3>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        <TrendingUp className="w-3 h-3" />
                                                        Fluxo Positivo
                                                    </div>
                                                    <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                                        Abertura: {formatCurrency(currentRegister.opening_balance)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex items-center gap-4 mt-12 bg-black/20 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl">
                                            <div className="flex-1">
                                                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1 block">Responsável</span>
                                                <p className="text-sm font-black text-foreground tracking-tight">Administrador do Sistema</p>
                                            </div>
                                            <div className="w-px h-8 bg-white/5" />
                                            <div className="flex-1">
                                                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1 block">Status</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <p className="text-sm font-black text-foreground tracking-tight">Caixa Aberto</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Panels */}
                                    <div className="lg:col-span-4 flex flex-col gap-6">
                                        <div className="grid grid-cols-2 gap-6 h-full">
                                            <button
                                                onClick={() => {
                                                    setTransactionType('entry')
                                                    setIsTransactionModalOpen(true)
                                                }}
                                                className="p-8 rounded-[3rem] bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center gap-4 transition-all group active:scale-95 shadow-xl"
                                            >
                                                <div className="w-16 h-16 rounded-2xl bg-emerald-500 shadow-[0_15px_30px_-5px_rgba(16,185,129,0.4)] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Plus className="w-8 h-8" />
                                                </div>
                                                <div className="text-center group-hover:translate-y-1 transition-transform">
                                                    <span className="font-black text-emerald-500 text-[10px] uppercase tracking-[0.2em]">Reforço</span>
                                                    <p className="text-[9px] text-emerald-500/40 font-bold uppercase tracking-widest mt-1 text-center">Entrada de Caixa</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setTransactionType('exit')
                                                    setIsTransactionModalOpen(true)
                                                }}
                                                className="p-8 rounded-[3rem] bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center gap-4 transition-all group active:scale-95 shadow-xl"
                                            >
                                                <div className="w-16 h-16 rounded-2xl bg-rose-500 shadow-[0_15px_30px_-5px_rgba(244,63,94,0.4)] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Minus className="w-8 h-8" />
                                                </div>
                                                <div className="text-center group-hover:translate-y-1 transition-transform">
                                                    <span className="font-black text-rose-500 text-[10px] uppercase tracking-[0.2em]">Retirada</span>
                                                    <p className="text-[9px] text-rose-500/40 font-bold uppercase tracking-widest mt-1 text-center">Saída de Caixa</p>
                                                </div>
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setIsClosingModalOpen(true)}
                                            className="p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-3xl border border-white/5 hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-4 group"
                                        >
                                            <Lock className="w-6 h-6 text-muted-foreground/40 group-hover:text-white transition-colors" />
                                            <span className="text-[11px] font-black uppercase tracking-[0.3em]">Encerrar Expediente</span>
                                            <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all text-white" />
                                        </button>
                                    </div>
                                </div>

                                {/* Daily Transactions Table */}
                                <div className="space-y-8 mt-12">
                                    <div className="flex items-center justify-between px-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <History className="w-5 h-5 text-primary" />
                                                <h2 className="text-2xl font-black tracking-tighter">Lançamentos do Dia</h2>
                                            </div>
                                            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Movimentações da sessão atual</p>
                                        </div>
                                    </div>

                                    <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left min-w-[900px]">
                                                <thead>
                                                    <tr className="bg-white/5 border-b border-white/5">
                                                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Horário</th>
                                                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Natureza & Descrição</th>
                                                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 text-center">Origem</th>
                                                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Pagamento</th>
                                                        <th className="p-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {transactionsList.length > 0 ? transactionsList.map((tx) => (
                                                        <tr key={tx.id} className="group hover:bg-white/5 transition-colors">
                                                            <td className="p-8 align-middle">
                                                                <div className="text-sm font-black text-foreground tabular-nums">
                                                                    {formatDateTime(tx.created_at).split(',')[1]?.replace('às', '') || '-'}
                                                                </div>
                                                            </td>
                                                            <td className="p-8 align-middle">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={cn(
                                                                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                                                                        tx.type === 'entry' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                                    )}>
                                                                        {tx.type === 'entry' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <span className="text-sm font-black text-foreground tracking-tight block">{tx.description}</span>
                                                                        <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest block">{tx.justification || 'Manual'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-8 align-middle text-center text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                                                                {tx.source_type?.replace('_', ' ') || 'Caixa'}
                                                            </td>
                                                            <td className="p-8 align-middle">
                                                                <div className="flex items-center gap-2">
                                                                    <PiggyBank className="w-4 h-4 text-muted-foreground/30" />
                                                                    <span className="text-xs font-black text-foreground/60 uppercase">{tx.payment_method?.name || 'Espécie'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-8 text-right align-middle text-xl font-black tabular-nums">
                                                                <span className={tx.type === 'entry' ? 'text-emerald-500' : 'text-rose-500'}>
                                                                    {tx.type === 'entry' ? '+' : '-'} {formatCurrency(tx.amount)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan={5} className="p-32 text-center text-muted-foreground/40 italic">Sem transações hoje.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
                        {/* History View */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-8 rounded-[2.5rem] bg-card/40 border border-white/5 backdrop-blur-3xl shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Receita Total</span>
                                </div>
                                <p className="text-4xl font-black text-foreground tracking-tighter">{formatCurrency(totalReceived)}</p>
                            </div>
                            <div className="p-8 rounded-[2.5rem] bg-card/40 border border-white/5 backdrop-blur-3xl shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Pendente</span>
                                </div>
                                <p className="text-4xl font-black text-foreground tracking-tighter">{formatCurrency(totalPending)}</p>
                            </div>
                            <div className="p-8 rounded-[2.5rem] bg-card/40 border border-white/5 backdrop-blur-3xl shadow-xl flex items-center justify-center">
                                <RegisterPaymentButton customers={customers} orders={orders} companyId={companyId || ''} />
                            </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="w-full md:w-96">
                                <SearchInput
                                    value={searchQuery}
                                    onChange={(e: any) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por cliente ou número de OS..."
                                    className="w-full bg-muted/30 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 backdrop-blur-3xl"
                                />
                            </div>
                        </div>

                        {/* General Transactions Table */}
                        <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/5">
                                            <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Data / Hora</th>
                                            <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Cliente / OS</th>
                                            <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Método</th>
                                            <th className="p-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Valor</th>
                                            <th className="p-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Status</th>
                                            <th className="p-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredPayments.length > 0 ? filteredPayments.map((p: any) => {
                                            const cfg = STATUS_CONFIG[p.payment_status] || { label: p.payment_status, color: 'text-muted-foreground/40', bg: 'bg-muted/5', border: 'border-border/10' }
                                            return (
                                                <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                                                    <td className="p-8 align-middle">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-foreground">{formatDateTime(p.payment_date).split(',')[0]}</span>
                                                            <span className="text-[10px] text-muted-foreground/40 font-bold font-mono italic uppercase tracking-widest">{formatDateTime(p.payment_date).split(',')[1]}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-8 align-middle">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-xs">
                                                                {(p.customers?.name || '?').charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-foreground uppercase tracking-tight">{p.customers?.name || '-'}</span>
                                                                <span className="text-[10px] text-primary/60 font-black tracking-widest uppercase">#{p.service_orders?.order_number || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-8 align-middle">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="w-4 h-4 text-muted-foreground/20" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">{PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-8 text-right align-middle">
                                                        <span className="text-2xl font-black tracking-tighter tabular-nums">{formatCurrency(p.amount)}</span>
                                                    </td>
                                                    <td className="p-8 text-center align-middle">
                                                        <span className={cn(
                                                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-lg",
                                                            cfg.bg, cfg.color, cfg.border
                                                        )}>
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="p-8 text-right align-middle">
                                                        <button className="p-3 text-muted-foreground/20 hover:text-foreground hover:bg-white/5 rounded-2xl transition-all">
                                                            <MoreHorizontal className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        }) : (
                                            <tr>
                                                <td colSpan={6} className="p-32 text-center text-muted-foreground/40 italic">Nenhum registro encontrado.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <OpenCashModal
                isOpen={isOpeningModalOpen}
                onClose={() => setIsOpeningModalOpen(false)}
                onSuccess={() => fetchData()}
                title="Abrir Fluxo de Caixa"
            />

            {currentRegister && (
                <>
                    <ManualTransactionModal
                        isOpen={isTransactionModalOpen}
                        onClose={() => setIsTransactionModalOpen(false)}
                        onSuccess={() => fetchData()}
                        type={transactionType}
                        cashRegisterId={currentRegister.id}
                        title={transactionType === 'entry' ? 'Reforço de Caixa' : 'Retirada de Caixa'}
                    />
                    <CloseCashModal
                        isOpen={isClosingModalOpen}
                        onClose={() => setIsClosingModalOpen(false)}
                        onSuccess={() => fetchData()}
                        cashRegister={currentRegister}
                        balance={calculateBalance}
                        title="Encerrar Fluxo Diário"
                    />
                </>
            )}
        </div>
    )
}

