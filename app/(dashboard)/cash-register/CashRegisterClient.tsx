'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Minus, ArrowUpRight, Wallet, History, Lock, Unlock, RefreshCw, Filter } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Header from '@/components/layout/Header'
import { CashRegister, CashTransaction } from '@/types'
import { toast } from 'sonner'
import OpenCashModal from '../../../components/financeiro/OpenCashModal'
import ManualTransactionModal from '../../../components/financeiro/ManualTransactionModal'
import CloseCashModal from '../../../components/financeiro/CloseCashModal'

export default function CashRegisterClient() {
    const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null)
    const [transactions, setTransactions] = useState<CashTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false)
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false)
    const [transactionType, setTransactionType] = useState<'entry' | 'exit'>('entry')

    const fetchData = async () => {
        setLoading(true)
        try {
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
        } catch (error) {
            console.error('Error fetching cash data:', error)
            toast.error('Erro ao carregar dados do caixa.')
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen border-t">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen">
            <Header title="Caixa do Dia" />

            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {!currentRegister ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-3xl shadow-xl text-center space-y-6">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center border border-border">
                            <Lock className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight">Caixa Fechado</h2>
                            <p className="text-muted-foreground max-w-sm">Você precisa abrir o caixa para começar a registrar transações financeiras hoje.</p>
                        </div>
                        <button
                            onClick={() => setIsOpeningModalOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            <Unlock className="w-5 h-5" />
                            Abrir Caixa Agora
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Current Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2 p-8 rounded-3xl bg-card border border-border relative overflow-hidden group shadow-2xl ring-1 ring-primary/5">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full group-hover:bg-primary/10 transition-colors" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                                            <Wallet className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Saldo em Caixa</span>
                                            <p className="text-[10px] text-muted-foreground font-mono">Desde {formatDateTime(currentRegister.opened_at)}</p>
                                        </div>
                                    </div>
                                    <h3 className="text-5xl font-black text-foreground tracking-tighter mb-4">
                                        {formatCurrency(calculateBalance)}
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                            {formatCurrency(currentRegister.opening_balance)} Início
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 md:col-span-2">
                                <div className="grid grid-cols-2 gap-4 h-full">
                                    <button
                                        onClick={() => {
                                            setTransactionType('entry')
                                            setIsTransactionModalOpen(true)
                                        }}
                                        className="p-6 rounded-3xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center gap-3 transition-all group active:scale-95"
                                    >
                                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-500 group-hover:scale-110 transition-transform">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold text-emerald-500 text-sm uppercase tracking-widest">Suprimento</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTransactionType('exit')
                                            setIsTransactionModalOpen(true)
                                        }}
                                        className="p-6 rounded-3xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center gap-3 transition-all group active:scale-95"
                                    >
                                        <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-500 group-hover:scale-110 transition-transform">
                                            <Minus className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold text-rose-500 text-sm uppercase tracking-widest">Sangria</span>
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsClosingModalOpen(true)}
                                    className="p-6 rounded-3xl bg-card border border-border hover:bg-muted font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-black/5"
                                >
                                    <Lock className="w-5 h-5 text-muted-foreground" />
                                    Fechar Caixa do Dia
                                </button>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <History className="w-5 h-5 text-primary" />
                                    <h2 className="text-xl font-black tracking-tight">Últimas Movimentações</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all border border-border bg-card">
                                        <Filter className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
                                <div className="overflow-x-scroll">
                                    <table className="w-full text-left min-w-[800px]">
                                        <thead>
                                            <tr className="bg-muted/50 border-b border-border">
                                                <th className="p-5 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Horário</th>
                                                <th className="p-5 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Descrição / Justificativa</th>
                                                <th className="p-5 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Origem</th>
                                                <th className="p-5 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Método</th>
                                                <th className="p-5 text-right text-xs font-black uppercase tracking-widest text-muted-foreground/60">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {transactionsList.length > 0 ? transactionsList.map((tx) => (
                                                <tr key={tx.id} className="group hover:bg-muted/30 transition-colors">
                                                    <td className="p-5 text-sm font-mono text-muted-foreground/60 italic">
                                                        {formatDateTime(tx.created_at).split(',')[1]?.replace('às', '') || '-'}
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-foreground line-clamp-1">{tx.description || 'Movimentação manual'}</span>
                                                            <span className="text-[10px] text-muted-foreground/60 font-medium italic lowercase">{tx.justification}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-muted text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 border border-border/50">
                                                            {tx.source_type?.replace('_', ' ') || 'Manual'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {tx.payment_method?.name || 'Dinheiro'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <span className={tx.type === 'entry' ? 'text-emerald-500' : 'text-rose-500'}>
                                                                {tx.type === 'entry' ? '+' : '-'}
                                                            </span>
                                                            <span className={`text-lg font-black tracking-tight ${tx.type === 'entry' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {formatCurrency(tx.amount)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={5} className="p-20 text-center text-muted-foreground/40 italic">Nenhuma transação registrada neste caixa ainda.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <OpenCashModal
                isOpen={isOpeningModalOpen}
                onClose={() => setIsOpeningModalOpen(false)}
                onSuccess={() => fetchData()}
            />

            {currentRegister && (
                <>
                    <ManualTransactionModal
                        isOpen={isTransactionModalOpen}
                        onClose={() => setIsTransactionModalOpen(false)}
                        onSuccess={() => fetchData()}
                        type={transactionType}
                        cashRegisterId={currentRegister.id}
                    />
                    <CloseCashModal
                        isOpen={isClosingModalOpen}
                        onClose={() => setIsClosingModalOpen(false)}
                        onSuccess={() => fetchData()}
                        cashRegister={currentRegister}
                        balance={calculateBalance}
                    />
                </>
            )}
        </div>
    )
}
